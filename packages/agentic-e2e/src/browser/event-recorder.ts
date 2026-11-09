import { randomUUID } from "node:crypto";

import type { EvidenceRecord } from "../evidence.ts";
import {
  parseStandardEventMessage,
  standardEventsRecorderScript,
  unsettledStandardEvent,
  type RecorderArmResult,
  type StandardEventEvidence,
  type StandardEventName,
} from "../shopify/standard-events.ts";
import { isRecord, type CdpConnection, type CdpEvent } from "./cdp.ts";

type PendingEvent = { event: StandardEventEvidence["event"]; context: string };
type Params = Record<string, unknown>;

/**
 * Installs the read-only Standard Events recorder in tabs and frames over raw CDP and tracks
 * awaited events until they settle.
 *
 * Chrome keeps the JavaScript realm when a window replaces its initial about:blank document with
 * a same-origin page, and does not run init scripts for that page. Popups that can reach their
 * opener pause before each script until a script of a real document is reached, and the recorder
 * is armed before that script runs. Other reused realms (same-origin frames) are armed when they
 * commit and get an explicit `recorder-error`, because earlier events can be missing.
 */
export class StandardEventRecorder {
  private readonly cdp: CdpConnection;
  private readonly emit: (record: EvidenceRecord) => void;
  private readonly bindingName = `__agenticE2E${randomUUID().replaceAll("-", "")}`;
  private readonly script: string;
  /** Awaited events without an outcome yet, keyed by correlation ID. */
  private readonly pending = new Map<string, PendingEvent>();
  /** Default execution context per `${sessionId}:${frameId}`. */
  private readonly contexts = new Map<string, number>();
  /** Instrumentation breakpoints of popups that have not reached a real document yet. */
  private readonly breakpoints = new Map<string, Promise<string | undefined>>();
  /** Popups that keep the Debugger domain on until their first load event. */
  private readonly debugging = new Set<string>();
  /** Scripts of isolated worlds (for example Playwright's), per `${sessionId}:${scriptId}`. */
  private readonly isolatedScripts = new Set<string>();
  private readonly handlers: Record<string, (sessionId: string, params: Params) => void> = {
    "Runtime.bindingCalled": (sessionId, params) => this.onBindingCalled(sessionId, params),
    "Runtime.executionContextCreated": (sessionId, params) =>
      this.onContextCreated(sessionId, params),
    "Runtime.executionContextDestroyed": (sessionId, params) =>
      this.onContextsGone(sessionId, (id) => id === params.executionContextId),
    "Runtime.executionContextsCleared": (sessionId) => this.onContextsGone(sessionId, () => true),
    "Debugger.scriptParsed": (sessionId, params) => this.onScriptParsed(sessionId, params),
    "Debugger.paused": (sessionId, params) => void this.onPaused(sessionId, params),
    "Page.frameNavigated": (sessionId, params) => this.onFrameNavigated(sessionId, params),
    "Page.loadEventFired": (sessionId) => this.onLoad(sessionId),
  };

  /** Listens only for `names`. With none, the recorder is installed but records nothing. */
  constructor(
    cdp: CdpConnection,
    emit: (record: EvidenceRecord) => void,
    names: readonly StandardEventName[],
  ) {
    this.cdp = cdp;
    this.emit = emit;
    this.script = standardEventsRecorderScript(this.bindingName, names);
  }

  /** Commands for a paused tab or frame. Send them before `Runtime.runIfWaitingForDebugger`. */
  setup(sessionId: string, targetInfo: Params): Promise<unknown>[] {
    const commands = [
      // Page and Runtime must be enabled for init scripts and bindings to take effect.
      this.send(sessionId, "Page.enable"),
      this.send(sessionId, "Runtime.enable"),
      this.send(sessionId, "Runtime.addBinding", { name: this.bindingName }),
      this.send(sessionId, "Page.addScriptToEvaluateOnNewDocument", { source: this.script }),
    ];
    if (typeof targetInfo.openerId === "string" && targetInfo.canAccessOpener === true) {
      this.debugging.add(sessionId);
      commands.push(this.send(sessionId, "Debugger.enable"), this.pauseBeforeScripts(sessionId));
    }
    return commands;
  }

  onEvent({ method, params, sessionId }: CdpEvent) {
    if (sessionId !== undefined) this.handlers[method]?.(sessionId, params);
  }

  detach(sessionId: string) {
    this.breakpoints.delete(sessionId);
    this.forgetIsolatedScripts(sessionId);
    this.debugging.delete(sessionId);
    this.onContextsGone(sessionId, () => true, "target-closed");
  }

  async drain(timeoutMs: number) {
    const deadline = Date.now() + timeoutMs;
    while (this.pending.size > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  settleAll(reason: string) {
    this.settle(() => true, reason);
  }

  private async send(sessionId: string, method: string, params: Params = {}) {
    return this.cdp.send(method, params, sessionId);
  }

  private onBindingCalled(sessionId: string, params: Params) {
    if (params.name !== this.bindingName || typeof params.payload !== "string") return;
    const record = parseStandardEventMessage(params.payload);
    if (!record) return;
    const { event, awaited } = record.data;
    if (event.phase === "input") {
      const context = `${sessionId}:${String(params.executionContextId)}`;
      if (awaited === true) this.pending.set(event.id, { event, context });
    } else if (!this.pending.delete(event.id)) {
      // Only the first outcome of an awaited event is recorded.
      return;
    }
    this.emit(record);
  }

  private settle(matches: (pending: PendingEvent) => boolean, reason: string) {
    for (const [id, pending] of this.pending) {
      if (!matches(pending)) continue;
      this.pending.delete(id);
      this.emit(unsettledStandardEvent(pending.event, reason));
    }
  }

  private onContextCreated(sessionId: string, params: Params) {
    const context = isRecord(params.context) ? params.context : {};
    const aux = isRecord(context.auxData) ? context.auxData : {};
    if (
      aux.isDefault === true &&
      typeof aux.frameId === "string" &&
      typeof context.id === "number"
    ) {
      this.contexts.set(`${sessionId}:${aux.frameId}`, context.id);
    }
  }

  private onContextsGone(
    sessionId: string,
    matches: (contextId: unknown) => boolean,
    reason = "document-unloaded",
  ) {
    const prefix = `${sessionId}:`;
    for (const [key, contextId] of this.contexts) {
      if (key.startsWith(prefix) && matches(contextId)) this.contexts.delete(key);
    }
    this.settle(
      (pending) =>
        pending.context.startsWith(prefix) && matches(Number(pending.context.slice(prefix.length))),
      reason,
    );
  }

  private async pauseBeforeScripts(sessionId: string): Promise<unknown> {
    const breakpoint = this.send(sessionId, "Debugger.setInstrumentationBreakpoint", {
      instrumentation: "beforeScriptExecution",
    }).then((result) =>
      isRecord(result) && typeof result.breakpointId === "string" ? result.breakpointId : undefined,
    );
    this.breakpoints.set(sessionId, breakpoint);
    return breakpoint;
  }

  private onScriptParsed(sessionId: string, params: Params) {
    const aux = isRecord(params.executionContextAuxData) ? params.executionContextAuxData : {};
    if (this.breakpoints.has(sessionId) && aux.isDefault === false) {
      this.isolatedScripts.add(`${sessionId}:${String(params.scriptId)}`);
    }
  }

  /**
   * Arms the recorder before the paused script runs, then resumes. CDP cannot evaluate
   * JavaScript during this pause, so a conditional breakpoint at the script start runs the
   * recorder script in the page and never pauses. After the first script of a real document,
   * scripts no longer pause.
   */
  private async onPaused(sessionId: string, params: Params) {
    try {
      const breakpoint = this.breakpoints.get(sessionId);
      const frame: unknown = Array.isArray(params.callFrames) ? params.callFrames[0] : undefined;
      const data = isRecord(params.data) ? params.data : {};
      if (params.reason !== "instrumentation" || breakpoint === undefined) return;
      // Isolated worlds cannot see the payload fields that pages set on events.
      if (this.isolatedScripts.has(`${sessionId}:${String(data.scriptId)}`)) return;
      if (!isRecord(frame) || !isRecord(frame.location)) return;
      await this.send(sessionId, "Debugger.setBreakpoint", {
        location: frame.location,
        condition: `(${this.script}), false`,
      });
      if (typeof data.url === "string" && /^https?:/.test(data.url)) {
        this.breakpoints.delete(sessionId);
        this.forgetIsolatedScripts(sessionId);
        const breakpointId = await breakpoint;
        if (breakpointId !== undefined) {
          await this.send(sessionId, "Debugger.removeBreakpoint", { breakpointId });
        }
      }
    } catch {
      // The target may be gone. Resume below either way.
    } finally {
      // Also resumes `debugger` statements while the Debugger domain is on.
      await this.send(sessionId, "Debugger.resume").catch(() => undefined);
    }
  }

  private forgetIsolatedScripts(sessionId: string) {
    for (const key of this.isolatedScripts) {
      if (key.startsWith(`${sessionId}:`)) this.isolatedScripts.delete(key);
    }
  }

  private onLoad(sessionId: string) {
    if (this.breakpoints.has(sessionId) || !this.debugging.delete(sessionId)) return;
    this.send(sessionId, "Debugger.disable").catch(() => undefined);
  }

  /** A frame kept its realm (no new context). Arm it now and report the possible gap. */
  private onFrameNavigated(sessionId: string, params: Params) {
    const frame = isRecord(params.frame) ? params.frame : {};
    const contextId =
      typeof frame.id === "string" ? this.contexts.get(`${sessionId}:${frame.id}`) : undefined;
    if (contextId === undefined || this.breakpoints.has(sessionId)) return;
    this.send(sessionId, "Runtime.evaluate", {
      expression: this.script,
      contextId,
      returnByValue: true,
      silent: true,
    }).then(
      (result) => {
        const armed = armResult(result);
        if (!armed?.fresh || armed.url === "about:blank") return;
        this.emit({
          kind: "recorder-error",
          timestamp: Date.now(),
          data: {
            message:
              "Standard Events recorder was armed after a reused window committed. Earlier events in this document can be missing.",
          },
        });
      },
      () => undefined,
    );
  }
}

function armResult(result: unknown): RecorderArmResult | undefined {
  const value = isRecord(result) && isRecord(result.result) ? result.result.value : undefined;
  if (!isRecord(value) || typeof value.url !== "string") return undefined;
  return { fresh: value.fresh === true, url: value.url };
}
