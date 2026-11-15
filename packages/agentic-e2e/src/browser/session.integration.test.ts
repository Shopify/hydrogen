import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

// No real browser. Each test runs `createBrowserSession` in a separate driver process with a fake
// browser executable, so it can check that nothing keeps the driver's event loop alive.

const HOLDER_TAG = "agentic-e2e-fake-browser-holder";
/** The driver must exit well within this. The session close budget is about 4 s. */
const EXIT_LIMIT_MS = 15_000;
const SESSION_MODULE = new URL("session.ts", import.meta.url).pathname;
/** Abort to rejection. The session close budget is about 4 s. */
const ABORT_LIMIT_MS = 5_000;

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "agentic-e2e-session-test-"));
});

afterEach(async () => {
  // Always stop the fake processes, whatever the test result.
  for (const name of ["holder.pid", "browser.pid", "helper.pid"]) {
    const pid = Number(await readFile(join(workDir, name), "utf8").catch(() => ""));
    if (Number.isSafeInteger(pid) && pid > 0) {
      try {
        process.kill(-pid, "SIGKILL");
      } catch {
        // Already gone, or not a process group leader.
      }
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Already gone.
      }
    }
  }
  await rm(workDir, { recursive: true, force: true });
});

describe("createBrowserSession", () => {
  // A helper in the browser's own session inherits the fake's stderr and stays alive, then the
  // fake exits during startup. Helpers outside the browser's process group (Chrome's crashpad
  // handler, for example) can hold that pipe the same way.
  it("lets the process exit after a failed start, even when a detached helper holds the browser's stderr", async () => {
    const fakeBrowser = join(workDir, "fake-browser");
    await writeFile(
      fakeBrowser,
      `#!${process.execPath}
const { spawn } = require("node:child_process");
const { writeFileSync } = require("node:fs");
const holder = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)", ${JSON.stringify(HOLDER_TAG)}], {
  detached: true,
  stdio: ["ignore", "ignore", "inherit"],
});
writeFileSync(${JSON.stringify(join(workDir, "holder.pid"))}, String(holder.pid));
process.exit(1);
`,
    );
    await chmod(fakeBrowser, 0o755);
    // The session's temporary profile goes here, so the test can check that it is removed.
    const profiles = join(workDir, "profiles");
    await mkdir(profiles);
    const driver = join(workDir, "driver.mjs");
    // Returns after the rejection, without `process.exit`: the process ends only when nothing
    // keeps the event loop alive.
    await writeFile(
      driver,
      `import { createBrowserSession } from ${JSON.stringify(SESSION_MODULE)};
try {
  await createBrowserSession(${JSON.stringify(fakeBrowser)});
  process.stdout.write("started\\n");
} catch (error) {
  process.stdout.write(\`rejected: \${error.message.split("\\n", 1)[0]}\\n\`);
}
`,
    );

    const started = Date.now();
    const result = await runUntilExit(driver, { ...process.env, TMPDIR: profiles });

    expect(result).toEqual({ exited: true, stdout: "rejected: Browser exited during startup: \n" });
    expect(Date.now() - started).toBeLessThan(EXIT_LIMIT_MS);
    // The holder was alive the whole time: it really held the pipe.
    const pid = Number(await readFile(join(workDir, "holder.pid"), "utf8"));
    expect(() => process.kill(pid, 0)).not.toThrow();
    // The failed start removed its temporary profile.
    expect(await readdir(profiles)).toEqual([]);
  }, 30_000);

  it("cancels a browser that never prints its DevTools endpoint and stops its process group", async () => {
    // Marks that it started, then hangs like a browser that is stuck during startup.
    const result = await runAbortDriver(`
${startFakeBrowser()}
writeFileSync(${JSON.stringify(join(workDir, "abort-now"))}, "");
`);

    const { abortToRejectMs, ...exit } = result;
    expect(exit).toEqual({ exited: true, stdout: "rejected: test abort\n" });
    await expectCleanedUp(abortToRejectMs);
  }, 30_000);

  it("cancels a stalled CDP connection and stops its process group", async () => {
    // Prints a DevTools endpoint that accepts connections but never answers the WebSocket handshake.
    const result = await runAbortDriver(`
${startFakeBrowser()}
const server = require("node:net").createServer(() => {
  writeFileSync(${JSON.stringify(join(workDir, "abort-now"))}, "");
});
server.listen(0, "127.0.0.1", () => {
  process.stderr.write(\`DevTools listening on ws://127.0.0.1:\${server.address().port}/devtools/browser/fake\\n\`);
});
`);

    const { abortToRejectMs, ...exit } = result;
    expect(exit).toEqual({ exited: true, stdout: "rejected: test abort\n" });
    await expectCleanedUp(abortToRejectMs);
  }, 30_000);
});

/** Fake browser prelude: records its pid and a helper in its process group, then stays alive. */
function startFakeBrowser(): string {
  return `const { spawn } = require("node:child_process");
const { writeFileSync } = require("node:fs");
const helper = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
writeFileSync(${JSON.stringify(join(workDir, "helper.pid"))}, String(helper.pid));
writeFileSync(${JSON.stringify(join(workDir, "browser.pid"))}, String(process.pid));
setInterval(() => {}, 1000);`;
}

/**
 * Starts a session with the fake browser `body` and aborts it when the fake creates `abort-now`.
 * The 30-second startup timeouts would keep the driver alive past the exit limit.
 */
async function runAbortDriver(
  body: string,
): Promise<{ exited: boolean; stdout: string; abortToRejectMs: number }> {
  const fakeBrowser = join(workDir, "fake-browser");
  await writeFile(fakeBrowser, `#!${process.execPath}\n${body}`);
  await chmod(fakeBrowser, 0o755);
  await mkdir(join(workDir, "profiles"));
  const driver = join(workDir, "driver.mjs");
  await writeFile(
    driver,
    `import { existsSync, writeFileSync } from "node:fs";
import { createBrowserSession } from ${JSON.stringify(SESSION_MODULE)};
const controller = new AbortController();
let abortedAt = 0;
const poll = setInterval(() => {
  if (!existsSync(${JSON.stringify(join(workDir, "abort-now"))})) return;
  clearInterval(poll);
  abortedAt = performance.now();
  controller.abort(new Error("test abort"));
}, 10);
try {
  await createBrowserSession(${JSON.stringify(fakeBrowser)}, { signal: controller.signal });
  process.stdout.write("started\\n");
} catch (error) {
  writeFileSync(${JSON.stringify(join(workDir, "abort-ms"))}, String(performance.now() - abortedAt));
  process.stdout.write(\`rejected: \${error.message.split("\\n", 1)[0]}\\n\`);
} finally {
  clearInterval(poll);
}
`,
  );
  const result = await runUntilExit(driver, { ...process.env, TMPDIR: join(workDir, "profiles") });
  const abortToRejectMs = Number(await readFile(join(workDir, "abort-ms"), "utf8").catch(() => ""));
  return { ...result, abortToRejectMs };
}

/** The abort was prompt, and the fake browser, its helper, and the profile are gone. */
async function expectCleanedUp(abortToRejectMs: number): Promise<void> {
  expect(abortToRejectMs).toBeGreaterThanOrEqual(0);
  expect(abortToRejectMs).toBeLessThan(ABORT_LIMIT_MS);
  for (const name of ["browser.pid", "helper.pid"]) {
    const pid = Number(await readFile(join(workDir, name), "utf8"));
    // Killed processes can be reaped shortly after the driver exits.
    await expect.poll(() => isAlive(pid), { timeout: 5_000 }).toBe(false);
  }
  expect(await readdir(join(workDir, "profiles"))).toEqual([]);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Runs the driver. Kills it and reports `exited: false` when it does not exit in time. */
async function runUntilExit(
  script: string,
  env: NodeJS.ProcessEnv,
): Promise<{ exited: boolean; stdout: string }> {
  const child = spawn(process.execPath, [script], { env, stdio: ["ignore", "pipe", "inherit"] });
  let stdout = "";
  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  const { promise, resolve } = Promise.withResolvers<boolean>();
  const timer = setTimeout(() => resolve(false), EXIT_LIMIT_MS);
  child.once("exit", () => resolve(true));
  const exited = await promise;
  clearTimeout(timer);
  if (!exited) child.kill("SIGKILL");
  return { exited, stdout };
}
