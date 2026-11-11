import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium, type Browser, type Page } from "playwright-core";

import { untilAborted } from "../interrupt.ts";

export interface BrowserSessionOptions {
  /** Aborts the startup. The session then removes the browser and the profile, and rejects. */
  signal?: AbortSignal;
}

export interface BrowserSession {
  page: Page;
  /** Closes the browser process and removes the temporary profile. Safe to call twice. */
  close(): Promise<void>;
}

const LAUNCH_TIMEOUT_MS = 30_000;
// Close budget: the kill comes by 2 s, and close returns within about 4 s.
const GRACEFUL_CLOSE_MS = 2_000;
const EXIT_WAIT_MS = 1_000;
const DISCONNECT_MS = 1_000;
const NEVER_ABORTED = new AbortController().signal;

/**
 * Launches a headless browser that this session owns, with a fresh temporary profile, and
 * connects Playwright to it over CDP.
 *
 * Executable order: `executablePath`, `AGENTIC_E2E_BROWSER_PATH`, then the Chromium build that
 * matches this package's `playwright-core` (install it with `browser:install`).
 */
export async function createBrowserSession(
  executablePath?: string,
  { signal = NEVER_ABORTED }: BrowserSessionOptions = {},
): Promise<BrowserSession> {
  signal.throwIfAborted();
  const executable = resolveExecutablePath(executablePath);
  const userDataDir = await mkdtemp(join(tmpdir(), "agentic-e2e-browser-"));
  const owned = new OwnedBrowser(userDataDir);
  try {
    signal.throwIfAborted();
    const cdpUrl = await owned.launch(executable, signal);
    // On abort, `owned.close()` kills the browser, which also ends a pending CDP connection.
    const page = await untilAborted(owned.connect(cdpUrl), signal);
    let closing: Promise<void> | undefined;
    return { page, close: async () => (closing ??= owned.close()) };
  } catch (error) {
    await owned.close();
    throw error;
  }
}

class OwnedBrowser {
  private child: ChildProcess | undefined;
  private exited: Promise<void> = Promise.resolve();
  private browser: Browser | undefined;
  private connecting: Promise<Browser> | undefined;
  private readonly killOnExit = () => this.kill();
  private readonly userDataDir: string;

  constructor(userDataDir: string) {
    this.userDataDir = userDataDir;
  }

  async launch(executablePath: string, signal: AbortSignal): Promise<string> {
    const child = spawn(executablePath, browserArgs(this.userDataDir), {
      detached: process.platform !== "win32",
      stdio: ["ignore", "ignore", "pipe"],
    });
    this.child = child;
    this.exited = new Promise((resolve) => {
      child.once("exit", () => resolve());
      child.once("error", () => resolve());
    });
    process.once("exit", this.killOnExit);
    return readDevToolsUrl(child, signal);
  }

  async connect(cdpUrl: string): Promise<Page> {
    this.connecting = chromium.connectOverCDP(cdpUrl, { timeout: LAUNCH_TIMEOUT_MS });
    this.browser = await this.connecting;
    const context = this.browser.contexts()[0];
    if (!context) throw new Error("Browser has no default context");
    return context.pages()[0] ?? (await context.newPage());
  }

  /** Time-bounded: the browser is killed within the close budget even if a step hangs. */
  async close(): Promise<void> {
    try {
      await settlesWithin(this.closeGracefully(), GRACEFUL_CLOSE_MS);
    } finally {
      // Also stops helper processes left in the browser's process group.
      this.kill();
      await settlesWithin(this.exited, EXIT_WAIT_MS);
      // Helpers outside the process group (Chrome's crashpad handler, for example) can keep the
      // write end of the stderr pipe open. Release the read end so it cannot keep Node alive.
      this.child?.stderr?.removeAllListeners();
      this.child?.stderr?.destroy();
      // Also disconnects a CDP connection that finishes after an aborted startup.
      await settlesWithin(
        this.connecting?.then((browser) => browser.close()),
        DISCONNECT_MS,
      );
      process.off("exit", this.killOnExit);
      await rm(this.userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }

  private async closeGracefully() {
    const browser = this.browser;
    if (!browser?.isConnected()) return;
    // `Browser.close()` in Playwright only disconnects a CDP-connected browser.
    const cdp = await browser.newBrowserCDPSession();
    await cdp.send("Browser.close").catch(() => undefined);
    await this.exited;
  }

  private kill() {
    const pid = this.child?.pid;
    if (pid === undefined) return;
    try {
      if (process.platform === "win32") this.child?.kill("SIGKILL");
      else process.kill(-pid, "SIGKILL");
    } catch {
      // Already gone.
    }
  }
}

function resolveExecutablePath(explicit: string | undefined): string {
  const configured = [explicit, process.env.AGENTIC_E2E_BROWSER_PATH].find(
    (candidate) => candidate !== undefined && candidate !== "",
  );
  if (configured !== undefined) return configured;
  const playwrightChromium = chromium.executablePath();
  if (existsSync(playwrightChromium)) return playwrightChromium;
  throw new Error(
    "Chromium for Playwright is not installed. Run: pnpm --filter @shopify/agentic-e2e run browser:install",
  );
}

function browserArgs(userDataDir: string): string[] {
  return [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-component-extensions-with-background-pages",
    "--disable-sync",
    "--password-store=basic",
    "--use-mock-keychain",
    "--mute-audio",
    "about:blank",
  ];
}

async function readDevToolsUrl(child: ChildProcess, signal: AbortSignal): Promise<string> {
  const stderr = child.stderr;
  if (!stderr) throw new Error("Browser stderr is not available");
  return new Promise((resolve, reject) => {
    let output = "";
    const onData = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-16_384);
      const url = /DevTools listening on (ws:\/\/\S+)/.exec(output)?.[1];
      if (url !== undefined) finish(() => resolve(url));
    };
    const onExit = () =>
      finish(() => reject(new Error(`Browser exited during startup: ${output.slice(-2_000)}`)));
    const onError = (error: Error) => finish(() => reject(error));
    const onAbort = () => finish(() => reject(signal.reason));
    const timer = setTimeout(
      () => finish(() => reject(new Error("Timed out waiting for the browser DevTools endpoint"))),
      LAUNCH_TIMEOUT_MS,
    );
    function finish(settle: () => void) {
      clearTimeout(timer);
      stderr?.off("data", onData);
      child.off("exit", onExit);
      child.off("error", onError);
      signal.removeEventListener("abort", onAbort);
      // Keep draining stderr so the browser never blocks on a full pipe.
      stderr?.resume();
      settle();
    }
    stderr.on("data", onData);
    child.once("exit", onExit);
    child.once("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function settlesWithin(promise: Promise<unknown> | undefined, ms: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  const settled = (promise ?? Promise.resolve()).then(
    () => undefined,
    () => undefined,
  );
  await Promise.race([settled, timeout]);
  clearTimeout(timer);
}
