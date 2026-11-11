import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium, type Browser } from "playwright-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBrowserSession } from "./session.ts";

// The browser is a fake executable that prints a DevTools endpoint and stays alive. Playwright's
// CDP connection is mocked, so each test controls when the connection settles.
vi.mock("playwright-core", () => ({
  chromium: { connectOverCDP: vi.fn(), executablePath: vi.fn(() => "/missing-chromium") },
}));

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
  it("rejects before it launches a browser and leaves no profile when the signal is already aborted", async () => {
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
    controller.abort(reason);

    await expect(starting).rejects.toBe(reason);
    expect(isAlive(pid)).toBe(false);
    expect(await readdir(profiles)).toEqual([]);

    // The connection finishes, with a page, after the session gave up: it must not stay open.
    const late = { contexts: () => [{ pages: () => [{}] }], close: vi.fn(async () => undefined) };
    connection.resolve(late as unknown as Browser);
    await vi.waitFor(() => expect(late.close).toHaveBeenCalled());
  });
});

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
