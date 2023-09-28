export type H2OEvent = {
  url: string;
  eventType: 'request' | 'subrequest';
  requestId?: string | null;
  purpose?: string | null;
  startTime: number;
  endTime?: number;
  cacheStatus?: 'MISS' | 'HIT' | 'STALE' | 'PUT';
  waitUntil?: ExecutionContext['waitUntil'];
  stackLine?: string;
};

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
    const promise = eventLoggerService
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
        console.debug('Failed to log H2O event\n', error.stack);
      });

    promise && waitUntil?.(promise);
  };
}
