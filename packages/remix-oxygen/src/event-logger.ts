type H2OEvent = Parameters<NonNullable<typeof __H2O_LOG_EVENT>>[0];

let hasWarned = false;

/**
 * @deprecated Only used with the classic Remix compiler
 */
export function createEventLogger(appLoadContext: Record<string, unknown>) {
  const context = (appLoadContext || {}) as {
    env?: Record<string, any>;
    waitUntil?: (promise: Promise<any>) => void;
  };

  const eventLoggerService = context?.env?.H2O_LOG_EVENT as
    | undefined
    | {fetch: (req: Request) => Promise<Response>};

  if (typeof eventLoggerService?.fetch !== 'function') return;

  return ({
    url,
    endTime = Date.now(),
    waitUntil = context?.waitUntil,
    ...rest
  }: H2OEvent) => {
    const promise = Promise.resolve().then(() =>
      eventLoggerService
        .fetch(
          new Request(url, {
            method: 'POST',
            body: JSON.stringify({
              endTime,
              ...rest,
            }),
          }),
        )
        .catch((error: Error) => {
          if (!hasWarned) {
            // This might repeat a lot of times due to
            // the same issue, so we only warn once.
            console.debug('Failed to log H2O event\n', error.stack);
            hasWarned = true;
          }
        }),
    );

    promise && waitUntil?.(promise);
  };
}
