import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium, type Browser } from "playwright-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBrowserSession } from "./session.ts";

// The browser is a fake executable that prints a DevTools endpoint and stays alive. Playwright's
// CDP connection is mocked, so each test controls when the connection and the page settle.
vi.mock("playwright-core", () => ({
  chromium: { connectOverCDP: vi.fn(), executablePath: vi.fn(() => "/missing-chromium") },
}));

/** Startup cancellation must not wait for the 30-second startup timeouts. */
const PROMPT_MS = 5_000;

let workDir: string;
let profiles: string;
let fakeBrowser: string;
let pidFile: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "agentic-e2e-session-unit-"));
  profiles = join(workDir, "profiles");
  await mkdir(profiles);
  vi.stubEnv("TMPDIR", profiles);
  pidFile = join(workDir, "browser.pid");
  fakeBrowser = join(workDir, "fake-browser");
  await writeFile(
    fakeBrowser,
    `#!${process.execPath}
require("node:fs").writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
process.stderr.write("DevTools listening on ws://127.0.0.1:9/devtools/browser/fake\\n");
setInterval(() => {}, 1000);
`,
  );
  await chmod(fakeBrowser, 0o755);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.mocked(chromium.connectOverCDP).mockReset();
  // Always stop the fake browser, whatever the test result.
  const pid = Number(await readFile(pidFile, "utf8").catch(() => ""));
  if (Number.isSafeInteger(pid) && pid > 0 && isAlive(pid)) process.kill(pid, "SIGKILL");
  await rm(workDir, { recursive: true, force: true });
});

describe("createBrowserSession", () => {
  it("does not start a browser or create a profile when the signal is already aborted", async () => {
    const reason = new Error("stopped early");

    await expect(
      createBrowserSession(fakeBrowser, { signal: AbortSignal.abort(reason) }),
    ).rejects.toBe(reason);

    await expect(readFile(pidFile, "utf8")).rejects.toThrow();
    expect(await readdir(profiles)).toEqual([]);
  });

  it("cancels a pending CDP connection and disconnects it when it finishes late", async () => {
    const connection = Promise.withResolvers<Browser>();
    vi.mocked(chromium.connectOverCDP).mockReturnValue(connection.promise);
    const controller = new AbortController();
    const reason = new Error("stopped during connect");

    const starting = createBrowserSession(fakeBrowser, { signal: controller.signal });
    await vi.waitFor(() => expect(chromium.connectOverCDP).toHaveBeenCalledOnce());
    const pid = await browserPid();
    const abortedAt = performance.now();
    controller.abort(reason);

    await expect(starting).rejects.toBe(reason);
    expect(performance.now() - abortedAt).toBeLessThan(PROMPT_MS);
    expect(isAlive(pid)).toBe(false);
    expect(await readdir(profiles)).toEqual([]);

    // The connection finishes after the session gave up: it must not stay open.
    const late = fakeConnectedBrowser();
    connection.resolve(late as unknown as Browser);
    await vi.waitFor(() => expect(late.close).toHaveBeenCalled());
  });

  it("cancels a stalled page creation and disconnects the browser", async () => {
    const browser = fakeConnectedBrowser();
    vi.mocked(chromium.connectOverCDP).mockResolvedValue(browser as unknown as Browser);
    const controller = new AbortController();
    const reason = new Error("stopped during page creation");

    const starting = createBrowserSession(fakeBrowser, { signal: controller.signal });
    await vi.waitFor(() => expect(browser.newPage).toHaveBeenCalledOnce());
    const pid = await browserPid();
    const abortedAt = performance.now();
    controller.abort(reason);

    await expect(starting).rejects.toBe(reason);
    expect(performance.now() - abortedAt).toBeLessThan(PROMPT_MS);
    expect(isAlive(pid)).toBe(false);
    expect(browser.close).toHaveBeenCalled();
    expect(await readdir(profiles)).toEqual([]);
  });
});

/** A connected browser whose default context has no page, and whose new page never opens. */
function fakeConnectedBrowser() {
  const newPage = vi.fn(async () => new Promise<never>(() => undefined));
  return {
    newPage,
    // Not connected, so close does not try a graceful CDP `Browser.close`.
    isConnected: () => false,
    contexts: () => [{ pages: () => [], newPage }],
    close: vi.fn(async () => undefined),
  };
}

async function browserPid(): Promise<number> {
  let pid = Number.NaN;
  await vi.waitFor(async () => {
    pid = Number(await readFile(pidFile, "utf8"));
    expect(Number.isSafeInteger(pid)).toBe(true);
  });
  return pid;
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
