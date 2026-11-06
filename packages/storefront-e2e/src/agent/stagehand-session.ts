import type { Stagehand } from "@browserbasehq/stagehand";

import type { BrowserSession } from "../browser/session.ts";
import { errorMessage } from "../evidence.ts";
import { settleWithin } from "./settle.ts";

/**
 * One Stagehand instance attached to a browser session before the first
 * navigation. The buyer is created later from the same instance.
 *
 * Stagehand 3.7.3 does not discover out-of-process iframes that already exist
 * when it attaches. Attaching before the first navigation avoids that discovery
 * gap. Other SDK frame limitations, including A-B-A nesting, still apply.
 */
export interface StagehandSession {
  /** The original browser session. Its identity is kept, so lookups keyed by it still work. */
  browser: BrowserSession;
  /**
   * Stagehand attached over CDP, with no model config. The buyer passes its
   * explicit model config to `observer.agent()`; the observer's default model
   * client is never used for inference.
   */
  observer: Stagehand;
  /**
   * Closes Stagehand's CDP connection only, and resolves only after the socket closed
   * (`observer.context.close()`), so Stagehand can no longer drive the browser. Rejects when
   * that is not confirmed within the limit. Stagehand's own housekeeping (`observer.close()`)
   * then runs best effort with its own limit and never changes this result. Bounded and
   * idempotent. The browser stays open.
   */
  detach(): Promise<void>;
  /**
   * Detaches, waits a bounded time for the housekeeping, then always closes the browser.
   * Idempotent. Rejects if the detach or the browser close failed.
   */
  close(): Promise<void>;
}

/**
 * Stagehand 3.7.3 reads these at module load and then writes unredacted flow
 * logs (page URLs, prompts, tool arguments) to disk or stderr.
 */
const UNSAFE_LOGGING_ENV = ["BROWSERBASE_CONFIG_DIR", "BROWSERBASE_FLOW_LOGS"];

/** Upper bounds for Stagehand init, the CDP release, and the later housekeeping. */
const INIT_TIMEOUT_MS = 15_000;
const DETACH_TIMEOUT_MS = 2_000;
const HOUSEKEEPING_TIMEOUT_MS = 2_000;

/**
 * Attaches one Stagehand instance to `browser` over its existing CDP URL.
 *
 * No model credentials are required: the instance gets no model config, and
 * this function reads none of the buyer credential variables. Stagehand's own
 * constructor can still look up a provider-native key variable for its default
 * model client, but this observer never sends a model request with it.
 *
 * On failure, the observer (if created) is closed and the browser is always
 * closed, each within a bounded time. No buyer model config is passed here.
 */
export async function prepareStagehandSession(browser: BrowserSession): Promise<StagehandSession> {
  let observer: Stagehand | undefined;
  try {
    const unsafeLogging = UNSAFE_LOGGING_ENV.filter((name) => readEnv(name) !== undefined);
    if (unsafeLogging.length > 0) {
      throw new Error(
        `Unset ${unsafeLogging.join(", ")} before Stagehand loads. Stagehand writes unredacted logs when they are set.`,
      );
    }
    // Loaded after the logging check: Stagehand reads its flow-log variables at module load.
    const { Stagehand } = await import("@browserbasehq/stagehand");
    observer = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: { cdpUrl: browser.cdpUrl },
      // Stagehand 3.7.3 requires experimental mode for agent callbacks, abort
      // signals, message continuation, excludeTools, and custom tools.
      experimental: true,
      disableAPI: true,
      verbose: 0,
      disablePino: true,
      // Drop Stagehand's own log lines. They can hold raw page URLs and errors.
      logger: () => undefined,
    });
    const init = await settleWithin(observer.init(), INIT_TIMEOUT_MS);
    if (init.status === "timeout") {
      throw new Error(`Stagehand did not attach within ${INIT_TIMEOUT_MS} ms`);
    }
    if (init.status === "rejected") {
      throw init.error;
    }
  } catch (error) {
    if (observer !== undefined) {
      await settleWithin(observer.close(), DETACH_TIMEOUT_MS);
    }
    await browser.close().catch(() => undefined);
    // oxlint-disable-next-line preserve-caught-error -- Expose only the error message, not SDK properties.
    throw new Error(`Failed to attach Stagehand: ${errorMessage(error)}`);
  }
  return createSession(browser, observer);
}

function createSession(browser: BrowserSession, observer: Stagehand): StagehandSession {
  let detaching: Promise<void> | undefined;
  let housekeeping: Promise<unknown> | undefined;
  let closing: Promise<void> | undefined;
  const detach = async (): Promise<void> => {
    detaching ??= (async () => {
      // Strict release: `Stagehand.close()` swallows a failed context close, so the
      // context close is awaited directly. It resolves after the CDP socket closed.
      const release = Promise.resolve().then(async () => observer.context.close());
      const result = await settleWithin(release, DETACH_TIMEOUT_MS);
      if (result.status === "timeout") {
        throw new Error(`Stagehand did not detach within ${DETACH_TIMEOUT_MS} ms`);
      }
      if (result.status === "rejected") {
        throw new Error(`Stagehand failed to detach: ${errorMessage(result.error)}`);
      }
      // Housekeeping after the release, on its own limit. Not awaited here, so it cannot
      // turn a confirmed release into a failure.
      housekeeping = settleWithin(observer.close(), HOUSEKEEPING_TIMEOUT_MS);
    })();
    return detaching;
  };
  const close = async (): Promise<void> => {
    closing ??= (async () => {
      try {
        await detach();
        await housekeeping;
      } finally {
        await browser.close();
      }
    })();
    return closing;
  };
  return { browser, observer, detach, close };
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value === undefined || value === "" ? undefined : value;
}
