export type CombinedAbortSignal = {
  signal: AbortSignal;
  /**
   * Detaches the combined signal from its sources. Call it once the operation,
   * including reading the response body, has finished.
   */
  dispose: () => void;
};

const noop = () => {};

/**
 * Combines signals like `AbortSignal.any`, which some runtimes lack, such as
 * Next.js's local edge runtime and Safari before 17.4.
 */
export function combineAbortSignals(signals: AbortSignal[]): CombinedAbortSignal {
  if (typeof AbortSignal.any === "function") {
    return { signal: AbortSignal.any(signals), dispose: noop };
  }

  const controller = new AbortController();
  const aborted = signals.find((signal) => signal.aborted);
  if (aborted) {
    controller.abort(aborted.reason);
    return { signal: controller.signal, dispose: noop };
  }

  // Sources such as a request or store lifecycle signal can outlive many
  // operations, so each operation must remove its listeners when it finishes.
  const dispose = () => {
    for (const signal of signals) signal.removeEventListener("abort", onAbort);
  };
  function onAbort(this: AbortSignal) {
    dispose();
    controller.abort(this.reason);
  }
  for (const signal of signals) signal.addEventListener("abort", onAbort);

  return { signal: controller.signal, dispose };
}
