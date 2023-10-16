import {EventEmitter} from 'node:events';
import {ReadableStream} from 'node:stream/web';
import {Request, Response} from '@shopify/mini-oxygen';
import {getGraphiQLUrl} from './graphiql-url.js';

type RequestEvent = {
  event: string;
  data: string;
};

export const DEV_ROUTES = new Set(['/graphiql', '/debug-network']);

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

async function getRequestInfo(request: Request) {
  const data = await request.json<H2OEvent>();

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

export async function clearHistory(): Promise<Response> {
  eventHistory.length = 0;
  return new Response('ok');
}

export async function logRequestEvent(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (DEV_ROUTES.has(url.pathname)) {
    return new Response('ok');
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

  return new Response('ok');
}

export function streamRequestEvents(request: Request) {
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

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    },
  });
}
