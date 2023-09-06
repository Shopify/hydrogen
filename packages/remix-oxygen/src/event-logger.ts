export type H2OEvent = {
  url: string;
  eventType: 'request' | 'subrequest';
  startTime: number;
  endTime?: number;
  cacheStatus?: 'MISS' | 'HIT' | 'STALE' | 'PUT';
  waitUntil?: ExecutionContext['waitUntil'];
};

export type H2ORequestInfo = {
  requestId?: string | null;
  purpose?: string | null;
};

export function createEventLogger(
  appLoadContext: Record<string, unknown>,
  requestInfo: H2ORequestInfo,
) {
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
    eventType,
    startTime,
    endTime,
    cacheStatus,
    waitUntil = context?.waitUntil,
  }: H2OEvent) => {
    const promise = eventLoggerService
      .fetch(
        new Request(url, {
          headers: {
            purpose: requestInfo.purpose || '',
            'request-id': requestInfo.requestId || '',
            'hydrogen-event-type': eventType,
            'hydrogen-start-time': String(startTime),
            'hydrogen-end-time': String(endTime || Date.now()),
            'hydrogen-cache-status': cacheStatus || '',
          },
        }),
      )
      .catch((error: Error) => {
        console.debug('Failed to log H2O event\n', error.stack);
      });

    promise && waitUntil?.(promise);
  };
}
