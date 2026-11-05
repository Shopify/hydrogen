type Settlement =
  | { status: "settled" }
  | { status: "rejected"; error: unknown }
  | { status: "timeout" };

/**
 * Waits at most `timeoutMs` for `promise`. Never rejects. The handlers stay
 * attached after a timeout, so a late rejection is not unhandled.
 */
export async function settleWithin(
  promise: Promise<unknown>,
  timeoutMs: number,
): Promise<Settlement> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Settlement>((resolve) => {
    timer = setTimeout(() => resolve({ status: "timeout" }), timeoutMs);
  });
  const outcome = promise.then(
    (): Settlement => ({ status: "settled" }),
    (error: unknown): Settlement => ({ status: "rejected", error }),
  );
  try {
    return await Promise.race([outcome, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
