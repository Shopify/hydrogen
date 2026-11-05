import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium, type Browser, type Page } from "playwright-core";

import type { EvidenceRecord } from "../evidence.ts";
import { connectCdp, isRecord, type CdpConnection, type CdpEvent } from "./cdp.ts";
import { StandardEventRecorder } from "./event-recorder.ts";
import { installLocaleObserver } from "./locale.ts";
import { classifyDocumentRequest } from "./navigation-policy.ts";

/**
 * Where a blocked document request would have loaded. `top-level` is a tab or popup main frame.
 * `embedded` is a frame inside a page. `unknown` is treated like `top-level` (fail closed).
 */
export type DocumentFrame = "top-level" | "embedded" | "unknown";

export interface BrowserSession {
  page: Page;
  /** DevTools WebSocket URL. Other clients may attach, but this session owns the browser. */
  cdpUrl: string;
  /** Closes every tab, the browser process, and the temporary profile. Safe to call twice. */
  close(): Promise<void>;
}

export interface BrowserSessionOptions {
  baseUrl: string;
  onEvidence: (record: EvidenceRecord) => void | Promise<void>;
  artifactDirectory: string;
  executablePath?: string;
}

interface SessionInternals {
  artifactDirectory: string;
  emit(record: EvidenceRecord): void;
}

const internals = new WeakMap<BrowserSession, SessionInternals>();
/** Used only when no executable is configured and the file exists. */
const KNOWN_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];
const LAUNCH_TIMEOUT_MS = 30_000;
// Close budget: drain + graceful + exit wait + flush stays under 5 s, and the kill comes by 3.5 s.
const PENDING_EVENTS_GRACE_MS = 1_500;
const GRACEFUL_CLOSE_MS = 2_000;
const EXIT_WAIT_MS = 1_000;
const FLUSH_MS = 500;
const DOCUMENT_TARGETS = new Set(["page", "iframe"]);
const DOCUMENT_REQUESTS = {
  patterns: [{ urlPattern: "*", resourceType: "Document", requestStage: "Request" }],
};
const BLOCKED_ERROR = "net::ERR_BLOCKED_BY_CLIENT";

/** @internal Used by the recorder. */
export function getSessionInternals(session: BrowserSession): SessionInternals | undefined {
  return internals.get(session);
}

/** True when a navigation failed because the session blocked it (checkout, account, or scheme). */
export function isBlockedNavigationError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(BLOCKED_ERROR);
}

/**
 * Launches a headless guest browser that this session owns.
 *
 * Before any page loads, a raw CDP connection enables browser-wide document request
 * interception. It sees every document request of every tab, popup, and frame, including each
 * redirect hop, so checkout and customer account documents fail before they leave the browser.
 * If that connection drops or a block fails, the browser is killed. The same connection pauses
 * each new tab and frame to install the read-only Standard Events recorder before page scripts
 * run.
 */
export async function createBrowserSession(
  options: BrowserSessionOptions,
): Promise<BrowserSession> {
  const decision = classifyDocumentRequest(options.baseUrl, options.baseUrl);
  if (decision.action === "block") {
    throw new Error(`Base URL must be a guest storefront page (blocked: ${decision.reason})`);
  }
  const executablePath = resolveExecutablePath(options.executablePath);
  const evidence = createEvidenceSink(options.onEvidence);
  const userDataDir = await mkdtemp(join(tmpdir(), "storefront-e2e-browser-"));
  const runtime = new BrowserRuntime(userDataDir, options.baseUrl, evidence);
  try {
    const cdpUrl = await runtime.launch(executablePath);
    const page = await runtime.connectPlaywright(cdpUrl);
    // Before the first navigation, so every storefront document of the page is observed.
    const localeObserver = await installLocaleObserver(page, evidence.emit);
    let closing: Promise<void> | undefined;
    const session: BrowserSession = {
      page,
      cdpUrl,
      close: async () => {
        localeObserver.stop();
        return (closing ??= runtime.close());
      },
    };
    internals.set(session, { artifactDirectory: options.artifactDirectory, emit: evidence.emit });
    return session;
  } catch (error) {
    await runtime.close().catch(() => undefined);
    throw error;
  }
}

class BrowserRuntime {
  private child: ChildProcess | undefined;
  private exited: Promise<void> = Promise.resolve();
  private cdp: CdpConnection | undefined;
  private recorder: StandardEventRecorder | undefined;
  private browser: Browser | undefined;
  private pendingSetups: Promise<void>[] | undefined;
  private closing = false;
  private fatal: Error | undefined;
  private checkoutSeen = false;
  private readonly attached = new Set<string>();
  /**
   * Main frame IDs of tabs and popups. A page target ID is its main frame ID. With
   * `waitForDebuggerOnStart`, a popup target is attached before its first document request.
   */
  private readonly topLevelFrames = new Set<string>();
  /** Frames with a parent: `Page.frameAttached` children and out-of-process frame targets. */
  private readonly embeddedFrames = new Set<string>();
  private readonly killOnExit = () => this.kill();
  private readonly userDataDir: string;
  private readonly baseUrl: string;
  private readonly evidence: EvidenceSink;

  constructor(userDataDir: string, baseUrl: string, evidence: EvidenceSink) {
    this.userDataDir = userDataDir;
    this.baseUrl = baseUrl;
    this.evidence = evidence;
  }

  async launch(executablePath: string): Promise<string> {
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
    const cdpUrl = await readDevToolsUrl(child);
    const cdp = await connectCdp(cdpUrl, {
      onEvent: (event) => this.onEvent(event),
      onClose: (error) => this.fail(error),
    });
    this.cdp = cdp;
    this.recorder = new StandardEventRecorder(cdp, this.evidence.emit);
    // Browser-wide interception has no per-target race: it is active before the first page loads.
    await cdp.send("Fetch.enable", DOCUMENT_REQUESTS);
    const setups: Promise<void>[] = [];
    this.pendingSetups = setups;
    await cdp.send("Target.setAutoAttach", {
      autoAttach: true,
      waitForDebuggerOnStart: true,
      flatten: true,
    });
    await Promise.all(setups);
    this.pendingSetups = undefined;
    if (this.fatal) throw this.fatal;
    return cdpUrl;
  }

  async connectPlaywright(cdpUrl: string): Promise<Page> {
    this.browser = await chromium.connectOverCDP(cdpUrl, { timeout: LAUNCH_TIMEOUT_MS });
    const context = this.browser.contexts()[0];
    if (!context) throw new Error("Browser has no default context");
    return context.pages()[0] ?? (await context.newPage());
  }

  /** Time-bounded: the browser is killed within the close budget even if a step hangs. */
  async close(): Promise<void> {
    try {
      if (!this.closing && !this.fatal) await this.recorder?.drain(PENDING_EVENTS_GRACE_MS);
      this.closing = true;
      await settlesWithin(this.closeGracefully(), GRACEFUL_CLOSE_MS);
    } finally {
      this.closing = true;
      this.recorder?.settleAll("session-closed");
      this.cdp?.close();
      // Also stops helper processes left in the browser's process group.
      this.kill();
      await settlesWithin(this.exited, EXIT_WAIT_MS);
      process.off("exit", this.killOnExit);
      await rm(this.userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
    await settlesWithin(this.evidence.flush(), FLUSH_MS);
    const error = this.fatal ?? this.evidence.error;
    if (error !== undefined) throw error;
  }

  private async closeGracefully() {
    const cdp = this.cdp;
    if (!cdp || this.fatal) return;
    const result = await cdp.send("Target.getTargets").catch(() => undefined);
    const targets = isRecord(result) && Array.isArray(result.targetInfos) ? result.targetInfos : [];
    await Promise.all(
      targets.filter(isRecord).map(async (target) => {
        if (target.type !== "page") return;
        await cdp.send("Target.closeTarget", { targetId: target.targetId }).catch(() => undefined);
      }),
    );
    await this.browser?.close().catch(() => undefined);
    await cdp.send("Browser.close").catch(() => undefined);
    await this.exited;
  }

  /** Fails closed: a policy error stops the browser so no request can bypass the policy. */
  private fail(error: Error) {
    if (this.closing) return;
    this.fatal ??= error;
    this.kill();
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

  private onEvent(event: CdpEvent) {
    const { method, params, sessionId } = event;
    if (method === "Fetch.requestPaused" && sessionId === undefined) this.onRequestPaused(params);
    if (method === "Target.attachedToTarget") this.onAttached(params);
    if (
      method === "Page.frameAttached" &&
      typeof params.frameId === "string" &&
      typeof params.parentFrameId === "string"
    ) {
      this.embeddedFrames.add(params.frameId);
    }
    if (method === "Target.detachedFromTarget" && typeof params.sessionId === "string") {
      this.attached.delete(params.sessionId);
      this.recorder?.detach(params.sessionId);
    }
    this.recorder?.onEvent(event);
  }

  private onAttached(params: Record<string, unknown>) {
    const { sessionId, targetInfo } = params;
    if (typeof sessionId !== "string" || !isRecord(targetInfo)) return;
    this.attached.add(sessionId);
    if (typeof targetInfo.targetId === "string") {
      if (targetInfo.type === "page") this.topLevelFrames.add(targetInfo.targetId);
      if (targetInfo.type === "iframe") this.embeddedFrames.add(targetInfo.targetId);
    }
    const setup = this.setupTarget(sessionId, targetInfo);
    this.pendingSetups?.push(setup);
  }

  /**
   * Installs the recorder on a paused tab or frame, then resumes it. Commands on one session run
   * in order, so they apply before the target resumes. Responses are not awaited first: a
   * paused popup without a renderer answers only after it resumes.
   */
  private async setupTarget(sessionId: string, targetInfo: Record<string, unknown>) {
    const cdp = this.cdp;
    if (!cdp || !this.recorder) return;
    const documentTarget = DOCUMENT_TARGETS.has(String(targetInfo.type));
    const commands = documentTarget
      ? [
          ...this.recorder.setup(sessionId, targetInfo),
          cdp.send(
            "Target.setAutoAttach",
            { autoAttach: true, waitForDebuggerOnStart: true, flatten: true },
            sessionId,
          ),
        ]
      : [];
    try {
      await Promise.all([...commands, cdp.send("Runtime.runIfWaitingForDebugger", {}, sessionId)]);
    } catch (error) {
      // Navigation safety does not depend on this setup. Report recorder gaps for live targets.
      if (documentTarget && this.attached.has(sessionId) && !this.closing) {
        const message = error instanceof Error ? error.message : String(error);
        this.evidence.emit({ kind: "recorder-error", timestamp: Date.now(), data: { message } });
      }
    }
  }

  private onRequestPaused(params: Record<string, unknown>) {
    const cdp = this.cdp;
    const { requestId, request } = params;
    if (!cdp || typeof requestId !== "string") return;
    const url = isRecord(request) && typeof request.url === "string" ? request.url : "";
    const decision = classifyDocumentRequest(url, this.baseUrl);
    if (decision.action === "continue") {
      cdp.send("Fetch.continueRequest", { requestId }).catch(() => undefined);
      return;
    }
    cdp
      .send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        // An unknown ID means the request is already gone. Anything else fails closed.
        if (!message.includes("Invalid InterceptionId")) {
          this.fail(new Error(`Could not block a document request: ${message}`));
        }
      });
    const timestamp = Date.now();
    const frame = this.classifyFrame(params.frameId);
    if (decision.reason !== "checkout") {
      this.evidence.emit({
        kind: "navigation-blocked",
        timestamp,
        data: { reason: decision.reason, frame },
      });
      return;
    }
    // Secret-safe shape only. The raw URL and the CDP request are never recorded here.
    this.evidence.emit({
      kind: "navigation-blocked",
      timestamp,
      data: {
        reason: decision.reason,
        frame,
        redirectHop: typeof params.redirectedRequestId === "string",
        route: decision.route,
      },
    });
    // Only the first top-level checkout-looking request is the buyer's handoff. It is always
    // recorded, also when it has no readable cart reference, and a later candidate never
    // replaces it. The raw URL stays in memory: the runner registers it as a secret before the
    // record is written. Embedded frames (for example a checkout button widget) stay blocked
    // but are not a handoff.
    if (frame !== "embedded" && !this.checkoutSeen) {
      this.checkoutSeen = true;
      this.evidence.emit({
        kind: "checkout",
        timestamp,
        data: { ...decision.checkout, route: decision.route },
      });
    }
  }

  private classifyFrame(frameId: unknown): DocumentFrame {
    if (typeof frameId !== "string") return "unknown";
    if (this.topLevelFrames.has(frameId)) return "top-level";
    if (this.embeddedFrames.has(frameId)) return "embedded";
    return "unknown";
  }
}

interface EvidenceSink {
  emit(record: EvidenceRecord): void;
  flush(): Promise<void>;
  readonly error: unknown;
}

function createEvidenceSink(onEvidence: BrowserSessionOptions["onEvidence"]): EvidenceSink {
  const inFlight = new Set<Promise<void>>();
  let firstError: unknown;
  return {
    emit(record) {
      const delivery = (async () => onEvidence(record))()
        .catch((error: unknown) => {
          firstError ??= error;
        })
        .finally(() => inFlight.delete(delivery));
      inFlight.add(delivery);
    },
    async flush() {
      while (inFlight.size > 0) await Promise.all(inFlight);
    },
    get error() {
      return firstError;
    },
  };
}

function resolveExecutablePath(explicit: string | undefined): string {
  const configured = [explicit, process.env.PLAYWRIGHT_BROWSER_EXECUTABLE_PATH].find(
    (candidate) => candidate !== undefined && candidate !== "",
  );
  if (configured !== undefined) return configured;
  const found = [chromium.executablePath(), ...KNOWN_CHROME_PATHS].find((path) => existsSync(path));
  if (found !== undefined) return found;
  throw new Error("No Chromium executable found. Set PLAYWRIGHT_BROWSER_EXECUTABLE_PATH.");
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

async function readDevToolsUrl(child: ChildProcess): Promise<string> {
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
    const timer = setTimeout(
      () => finish(() => reject(new Error("Timed out waiting for the browser DevTools endpoint"))),
      LAUNCH_TIMEOUT_MS,
    );
    function finish(settle: () => void) {
      clearTimeout(timer);
      stderr?.off("data", onData);
      child.off("exit", onExit);
      child.off("error", onError);
      stderr?.resume();
      settle();
    }
    stderr.on("data", onData);
    child.once("exit", onExit);
    child.once("error", onError);
  });
}

async function settlesWithin(promise: Promise<unknown> | undefined, ms: number): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  const settled = (promise ?? Promise.resolve()).then(
    () => true,
    () => true,
  );
  const result = await Promise.race([settled, timeout]);
  clearTimeout(timer);
  return result;
}
