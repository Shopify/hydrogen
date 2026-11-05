import { errors, type Page } from "playwright-core";

export const PAGE_READY_TIMEOUT_MS = 15_000;

export interface PageReadyOptions {
  /** Ends the wait early. The promise then rejects with the abort reason. */
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Waits until the top-level page can be observed: `DOMContentLoaded` fired, then
 * `<body>` exists, is not hidden (`display`, `visibility`, `opacity`), and has child
 * elements. Both steps share one deadline. This does not wait for network idle, for
 * iframes, or for Stagehand to register frames. Error messages hold no page content or URLs.
 */
export async function waitForPageReady(
  page: Page,
  { signal, timeoutMs = PAGE_READY_TIMEOUT_MS }: PageReadyOptions = {},
): Promise<void> {
  signal?.throwIfAborted();
  const deadline = Date.now() + timeoutMs;
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(signal?.reason);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
  aborted.catch(() => undefined);
  // Each Playwright wait stays bounded by its own timeout, or ends when the page closes.
  const untilAborted = async (wait: Promise<unknown>) => {
    wait.catch(() => undefined);
    await Promise.race(signal === undefined ? [wait] : [wait, aborted]);
  };
  try {
    await untilAborted(page.waitForLoadState("domcontentloaded", { timeout: timeoutMs }));
    signal?.throwIfAborted();
    await untilAborted(
      page.waitForFunction(
        () => {
          const body = document.body;
          if (document.readyState === "loading" || !(body instanceof HTMLElement)) return false;
          const style = getComputedStyle(body);
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) > 0 &&
            body.childElementCount > 0
          );
        },
        undefined,
        { timeout: Math.max(1, deadline - Date.now()) },
      ),
    );
  } catch (error) {
    signal?.throwIfAborted();
    // oxlint-disable-next-line preserve-caught-error -- Playwright errors can hold page content.
    throw new Error(
      error instanceof errors.TimeoutError
        ? `Page did not become observable within ${timeoutMs} ms.`
        : "Page did not become observable: the page check failed.",
    );
  } finally {
    if (onAbort !== undefined) signal?.removeEventListener("abort", onAbort);
  }
}
