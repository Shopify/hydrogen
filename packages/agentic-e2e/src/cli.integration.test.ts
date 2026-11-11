import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createBrowserSession } from "./browser/session.ts";
import { main } from "./cli.ts";

// Real headless Chromium against a local HTTP fixture. Uses Playwright's Chromium (install it
// with `pnpm --filter @shopify/agentic-e2e run browser:install`) or AGENTIC_E2E_BROWSER_PATH.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

let server: Server;
let origin: string;
let closedPortOrigin: string;
let workDir: string;
let profileRoot: string;
let stdout: string[];

beforeAll(async () => {
  server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://fixture").pathname;
    if (path === "/start") {
      response.writeHead(302, { location: "/home" }).end();
    } else if (path === "/hang") {
      // Never answers, so a run cannot finish before the interrupt.
    } else if (path === "/home") {
      response
        .writeHead(200, { "content-type": "text/html" })
        .end("<!doctype html><title>Fixture Home</title><p>Home</p>");
    } else {
      response.writeHead(500, { "content-type": "text/html" }).end("<title>Broken</title>");
    }
  });
  origin = await listen(server);
  // A port that was just free and is now closed: connections are refused.
  const probe = createServer();
  closedPortOrigin = await listen(probe);
  await close(probe);
  workDir = await mkdtemp(join(tmpdir(), "agentic-e2e-test-"));
});

beforeEach(async () => {
  profileRoot = await mkdtemp(join(workDir, "tmp-"));
  vi.stubEnv("TMPDIR", profileRoot);
  stdout = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  // Every test must leave no browser process and no temporary profile behind.
  expect(browserProcesses()).toEqual([]);
  expect(await readdir(profileRoot)).toEqual([]);
});

afterAll(async () => {
  server.closeAllConnections();
  await close(server);
  await rm(workDir, { recursive: true, force: true });
});

describe("main", () => {
  it("opens the URL and reports the final URL and title", async () => {
    await expect(main([`${origin}/start`])).resolves.toBe(0);

    expect(results()).toEqual([{ status: "opened", url: `${origin}/home`, title: "Fixture Home" }]);
  });

  it("reports an HTTP error page as indeterminate", async () => {
    await expect(main([`${origin}/broken`])).resolves.toBe(2);

    expect(results()).toEqual([{ status: "indeterminate", reason: "HTTP 500" }]);
  });

  it("reports an unreachable port as indeterminate", async () => {
    await expect(main([`${closedPortOrigin}/`])).resolves.toBe(2);

    expect(results()).toEqual([
      { status: "indeterminate", reason: expect.stringContaining("ERR_CONNECTION_REFUSED") },
    ]);
  });

  it("stops on SIGINT while the browser starts and removes the browser and profile", async () => {
    const run = main([`${origin}/hang`]);
    // Interrupt as soon as the browser process exists: during launch or CDP connection setup.
    await vi.waitFor(() => expect(browserProcesses()).not.toEqual([]), {
      timeout: 10_000,
      interval: 5,
    });
    const interruptedAt = performance.now();
    process.emit("SIGINT", "SIGINT");

    await expect(run).resolves.toBe(2);
    expect(performance.now() - interruptedAt).toBeLessThan(5_000);
    expect(results()).toEqual([{ status: "indeterminate", reason: "Interrupted by SIGINT." }]);
  });
});

describe("createBrowserSession", () => {
  it("closes safely twice", async () => {
    const session = await createBrowserSession();
    await session.page.goto(`${origin}/home`);
    expect(browserProcesses()).not.toEqual([]);

    await session.close();
    await session.close();

    expect(browserProcesses()).toEqual([]);
  });

  it("removes the profile when the browser cannot start", async () => {
    await expect(createBrowserSession(join(workDir, "missing-browser"))).rejects.toThrow();
  });
});

function results(): unknown[] {
  return stdout
    .join("")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as unknown);
}

/** Command lines of running processes that use a profile under this test's TMPDIR. */
function browserProcesses(): string[] {
  const output = execFileSync("ps", ["-ax", "-o", "command="], { encoding: "utf8" });
  return output.split("\n").filter((line) => line.includes(profileRoot));
}

async function listen(target: Server): Promise<string> {
  await new Promise<void>((resolve) => target.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(target.address() as AddressInfo).port}`;
}

async function close(target: Server): Promise<void> {
  await new Promise((resolve) => target.close(resolve));
}
