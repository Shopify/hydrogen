// Make sure to match this type with the one in packages/cli/src/lib/request-events.ts
export type H2OEvent = {
  eventType: 'request' | 'subrequest';
  requestId?: string | null;
  purpose?: string | null;
  startTime: number;
  endTime: number;
  cacheStatus?: 'MISS' | 'HIT' | 'STALE' | 'PUT';
  waitUntil?: ExecutionContext['waitUntil'];
  graphql?: string;
  stackInfo?: {
    file?: string;
    func?: string;
    line?: number;
    column?: number;
  };
  responsePayload?: any;
  responseInit?: ResponseInit;
  cache?: {
    status?: string;
    strategy?: string;
    key?: string | readonly unknown[];
  };
  displayName?: string;
  url?: string;
};

let hasWarned = false;

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
