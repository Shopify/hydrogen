import {EventEmitter} from 'node:events';
import {ReadableStream} from 'node:stream/web';
import {getGraphiQLUrl} from './graphiql-url.js';
import {Request, Response} from '@shopify/mini-oxygen';
import type {
  Request as WorkerdRequest,
  Response as WorkerdResponse,
  ResponseInit,
} from 'miniflare';

export const H2O_BINDING_NAME = 'H2O_LOG_EVENT';

// These 2 types are based on Undici but have slight differences
type RequestKind = Request | WorkerdRequest;
type InferredResponse<R extends RequestKind> = R extends WorkerdRequest
  ? WorkerdResponse
  : Response;

let ResponseConstructor = Response as typeof Response | typeof WorkerdResponse;
export function setConstructors(constructors: {
  Response: typeof ResponseConstructor;
}) {
  ResponseConstructor = constructors.Response;
}

export const DEV_ROUTES = new Set(['/graphiql', '/debug-network']);

type RequestEvent = {
  event: string;
  data: string;
};

const EVENT_MAP: Record<string, string> = {
  request: 'Request',
  subrequest: 'Sub request',
};

export type H2OEvent = {
  eventType: 'request' | 'subrequest';
  requestId?: string | null;
  purpose?: string | null;
  startTime: number;
  endTime: number;
  cacheStatus?: 'MISS' | 'HIT' | 'STALE' | 'PUT';
  waitUntil?: ExecutionContext['waitUntil'];
  graphql?: string;
};

async function getRequestInfo(request: RequestKind) {
  const data = (await request.json()) as H2OEvent;

  return {
    id: data.requestId ?? '',
    eventType: data.eventType || 'unknown',
    startTime: data.startTime,
    endTime: data.endTime || Date.now(),
    purpose: data.purpose === 'prefetch' ? '(prefetch)' : '',
    cacheStatus: data.cacheStatus ?? '',
    graphql: data.graphql
      ? (JSON.parse(data.graphql) as {query: string; variables: object})
      : null,
  };
}

const eventEmitter = new EventEmitter();
const eventHistory: RequestEvent[] = [];

function createResponse<R extends RequestKind>(
  main: string | ReadableStream = 'ok',
  init?: Pick<ResponseInit, 'headers'>,
) {
  return new ResponseConstructor(main, init) as InferredResponse<R>;
}

async function clearHistory<R extends RequestKind>(
  request: R,
): Promise<InferredResponse<R>> {
  eventHistory.length = 0;
  return createResponse<R>();
}

export async function logRequestEvent<R extends RequestKind>(
  request: R,
): Promise<InferredResponse<R>> {
  const url = new URL(request.url);
  if (DEV_ROUTES.has(url.pathname)) {
    return createResponse<R>();
  }

  const {eventType, purpose, graphql, ...data} = await getRequestInfo(request);

  let graphiqlLink = '';
  let description = request.url;

  if (eventType === 'subrequest') {
    description =
      graphql?.query
        .match(/(query|mutation)\s+(\w+)/)?.[0]
        ?.replace(/\s+/, ' ') || decodeURIComponent(url.search.slice(1));

    if (graphql) {
      graphiqlLink = getGraphiQLUrl({graphql});
    }
  }

  const event = {
    event: EVENT_MAP[eventType] || eventType,
    data: JSON.stringify({
      ...data,
      url: `${purpose} ${description}`.trim(),
      graphiqlLink,
    }),
  };

  eventHistory.push(event);
  if (eventHistory.length > 100) eventHistory.shift();

  eventEmitter.emit('request', event);

  return createResponse<R>();
}

function streamRequestEvents<R extends RequestKind>(
  request: R,
): InferredResponse<R> {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const enqueueEvent = ({event = 'message', data}: RequestEvent) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      eventHistory.forEach(enqueueEvent);
      eventEmitter.addListener('request', enqueueEvent);

      let closed = false;

      function close() {
        if (closed) return;
        closed = true;
        request.signal.removeEventListener('abort', close);
        eventEmitter.removeListener('request', enqueueEvent);
        controller.close();
      }

      request.signal.addEventListener('abort', close);

      if (request.signal.aborted) return close();
    },
  });

  return createResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    },
  });
}

export function handleDebugNetworkRequest<R extends RequestKind>(request: R) {
  return request.method === 'DELETE'
    ? clearHistory(request)
    : streamRequestEvents(request);
}
