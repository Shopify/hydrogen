import { setTimeout as delay } from "node:timers/promises";

export const PAGE_READY_TIMEOUT_MS = 15_000;

/** The public capability used on both Playwright and Stagehand pages. */
interface ObservablePage {
  evaluate(predicate: () => boolean): Promise<boolean>;
}

export interface PageReadyOptions {
  /** Ends the wait early. The promise then rejects with the abort reason. */
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Kept self-contained because both browser clients serialize this function. */
function isPageObservable(): boolean {
  const body = document.body;
  if (document.readyState === "loading" || !(body instanceof HTMLElement)) return false;
  // Stagehand's load-state fast path accepts "interactive", which also covers
  // deferred scripts still running BEFORE DOMContentLoaded. Check the actual
  // event start in that state; "complete" also covers pages with no timing entry.
  if (document.readyState !== "complete") {
    const navigation = performance.getEntriesByType("navigation")[0];
    if (
      !(navigation instanceof PerformanceNavigationTiming) ||
      navigation.domContentLoadedEventStart === 0
    )
      return false;
  }
  const style = getComputedStyle(body);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity) > 0 &&
    body.childElementCount > 0
  );
}

/**
 * Waits until the top-level page can be observed: `DOMContentLoaded` fired, then
 * `<body>` exists, is not hidden (`display`, `visibility`, `opacity`), and has child
 * elements. Page acquisition and polling share one deadline. This does not wait for
 * network idle, for iframes, or for Stagehand to register frames. Errors hold no page content or URLs.
 */
export async function waitForPageReady(
  page: ObservablePage | Promise<ObservablePage>,
  { signal, timeoutMs = PAGE_READY_TIMEOUT_MS }: PageReadyOptions = {},
): Promise<void> {
  signal?.throwIfAborted();
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  const bounded = AbortSignal.any([timeout.signal, ...(signal === undefined ? [] : [signal])]);
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(bounded.reason);
    bounded.addEventListener("abort", onAbort, { once: true });
  });
  const wait = async () => {
    const currentPage = await page;
    bounded.throwIfAborted();
    // One evaluation at a time. The outer race also bounds an unresponsive CDP call;
    // after abort/timeout, a late evaluation cannot start another poll.
    while (!bounded.aborted) {
      let observable = false;
      try {
        observable = await currentPage.evaluate(isPageObservable);
      } catch {
        // Navigation can replace the evaluation context. Retry within the same deadline.
      }
      bounded.throwIfAborted();
      if (observable) return;
      await delay(50, undefined, { signal: bounded });
    }
    bounded.throwIfAborted();
  };
  try {
    await Promise.race([wait(), aborted]);
  } catch {
    signal?.throwIfAborted();
    throw new Error(
      timeout.signal.aborted
        ? `Page did not become observable within ${timeoutMs} ms.`
        : "Page did not become observable: the page check failed.",
    );
  } finally {
    clearTimeout(timer);
    if (onAbort !== undefined) bounded.removeEventListener("abort", onAbort);
  }
}
