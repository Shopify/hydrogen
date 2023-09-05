import {ReadableStream} from 'node:stream/web';
import {Request, Response} from '@shopify/mini-oxygen';

type RequestEvent = {
  event: string;
  data: string;
};

export const DEV_ROUTES = new Set(['/graphiql', '/debug-network']);

function getRequestInfo(request: Request) {
  return {
    id: request.headers.get('request-id')!,
    startTime: request.headers.get('hydrogen-start-time')!,
    endTime: request.headers.get('hydrogen-end-time') || String(Date.now()),
    purpose: request.headers.get('purpose') === 'prefetch' ? '(prefetch)' : '',
    cacheStatus: request.headers.get('hydrogen-cache-status') || 'MISS',
  };
}

const requestEvents: RequestEvent[] = [];

export async function logRequestEvent(request: Request): Promise<Response> {
  if (DEV_ROUTES.has(new URL(request.url).pathname)) {
    return new Response('ok');
  }

  if (requestEvents.length > 100) requestEvents.pop();

  const {purpose, cacheStatus, ...event} = getRequestInfo(request);

  requestEvents.push({
    event: 'Request',
    data: JSON.stringify({
      ...event,
      url: `${purpose} ${request.url}`.trim(),
    }),
  });

  return new Response('ok');
}

export async function logSubRequestEvent(request: Request): Promise<Response> {
  if (requestEvents.length > 100) requestEvents.pop();

  const {purpose, cacheStatus, ...event} = getRequestInfo(request);

  const queryName =
    decodeURIComponent(request.url)
      .match(/(query|mutation)\s+(\w+)/)?.[0]
      ?.replace(/\s+/, ' ') || request.url;

  requestEvents.push({
    event: 'Sub request',
    data: JSON.stringify({
      ...event,
      url: `${purpose} ${cacheStatus} ${queryName}`.trim(),
    }),
  });

  return new Response('ok');
}

export function streamRequestEvents(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const timer = setInterval(() => {
        const storedRequest = requestEvents.pop();

        if (storedRequest) {
          const {event = 'message', data} = storedRequest;
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      }, 100);

      let closed = false;

      function close() {
        if (closed) return;
        clearInterval(timer);
        closed = true;
        request.signal.removeEventListener('abort', close);
        controller.close();
      }

      request.signal.addEventListener('abort', close);

      if (request.signal.aborted) return close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
