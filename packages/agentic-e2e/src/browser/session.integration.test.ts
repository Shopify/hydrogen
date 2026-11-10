import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

// No real browser. A fake browser executable starts a helper in its own session that inherits
// the fake's stderr and stays alive, then exits during startup. Helpers outside the browser's
// process group (Chrome's crashpad handler, for example) can hold that pipe the same way.

const HOLDER_TAG = "agentic-e2e-fake-browser-holder";
/** The driver must exit well within this. The session close budget is about 4 s. */
const EXIT_LIMIT_MS = 15_000;
const SESSION_MODULE = new URL("session.ts", import.meta.url).pathname;

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "agentic-e2e-session-test-"));
});

afterEach(async () => {
  // Always stop the holder, whatever the test result.
  const pid = Number(await readFile(join(workDir, "holder.pid"), "utf8").catch(() => ""));
  if (Number.isSafeInteger(pid) && pid > 0) {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      // Already gone.
    }
  }
  await rm(workDir, { recursive: true, force: true });
});

describe("createBrowserSession", () => {
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
});

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
