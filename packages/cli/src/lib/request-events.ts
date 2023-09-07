import {EventEmitter} from 'node:events';
import {ReadableStream} from 'node:stream/web';
import {Request, Response} from '@shopify/mini-oxygen';

type RequestEvent = {
  event: string;
  data: string;
};

export const DEV_ROUTES = new Set(['/graphiql', '/debug-network']);

const EVENT_MAP: Record<string, string> = {
  request: 'Request',
  subrequest: 'Sub request',
};

function getRequestInfo(request: Request) {
  return {
    id: request.headers.get('request-id')!,
    eventType: request.headers.get('hydrogen-event-type') || 'unknown',
    startTime: request.headers.get('hydrogen-start-time')!,
    endTime: request.headers.get('hydrogen-end-time') || String(Date.now()),
    purpose: request.headers.get('purpose') === 'prefetch' ? '(prefetch)' : '',
    cacheStatus: request.headers.get('hydrogen-cache-status'),
  };
}

const eventEmitter = new EventEmitter();
const eventHistory: RequestEvent[] = [];

export async function clearHistory(): Promise<Response> {
  eventHistory.length = 0;
  return new Response('ok');
}

export async function logRequestEvent(request: Request): Promise<Response> {
  if (DEV_ROUTES.has(new URL(request.url).pathname)) {
    return new Response('ok');
  }

  const {eventType, purpose, ...data} = getRequestInfo(request);

  let description = request.url;

  if (eventType === 'subrequest') {
    description =
      decodeURIComponent(request.url)
        .match(/(query|mutation)\s+(\w+)/)?.[0]
        ?.replace(/\s+/, ' ') || request.url;
  }

  const event = {
    event: EVENT_MAP[eventType] || eventType,
    data: JSON.stringify({
      ...data,
      url: `${purpose} ${description}`.trim(),
    }),
  };

  if (eventHistory.length > 100) eventHistory.shift();
  eventHistory.push(event);

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
