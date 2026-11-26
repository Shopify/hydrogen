const INTERRUPT_SIGNALS: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];

/**
 * Runs `run` with a signal that aborts on SIGINT, SIGTERM, or SIGHUP. The handlers stay attached
 * until `run` settles: a repeated signal must not restore the default kill, which would skip
 * browser cleanup and the result. The handlers are removed on every path. `warn` writes each
 * interrupt line, without its line break.
 */
export async function withInterruptSignals<T>(
  run: (interrupt: AbortSignal) => Promise<T>,
  warn: (line: string) => void,
): Promise<T> {
  const controller = new AbortController();
  const onSignal = (signal: NodeJS.Signals): void => {
    if (controller.signal.aborted) {
      warn(`Received ${signal} again. Cleanup is still running.`);
      return;
    }
    warn(`Received ${signal}. Stopping the run.`);
    controller.abort(new Error(`Interrupted by ${signal}.`));
  };
  for (const signal of INTERRUPT_SIGNALS) process.on(signal, onSignal);
  try {
    return await run(controller.signal);
  } finally {
    for (const signal of INTERRUPT_SIGNALS) process.off(signal, onSignal);
  }
}

/** Rejects with the signal reason on abort. The losing promise can settle later. */
export async function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  promise.catch(() => undefined);
  signal.throwIfAborted();
  const { promise: aborted, reject } = Promise.withResolvers<never>();
  const onAbort = () => reject(signal.reason);
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    return await Promise.race([promise, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
