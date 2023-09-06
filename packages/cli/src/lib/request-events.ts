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
    event: request.headers.get('hydrogen-event-type') || 'unknown',
    startTime: request.headers.get('hydrogen-start-time')!,
    endTime: request.headers.get('hydrogen-end-time') || String(Date.now()),
    purpose: request.headers.get('purpose') === 'prefetch' ? '(prefetch)' : '',
    cacheStatus: request.headers.get('hydrogen-cache-status'),
  };
}

const requestEvents: RequestEvent[] = [];

export async function logRequestEvent(request: Request): Promise<Response> {
  if (DEV_ROUTES.has(new URL(request.url).pathname)) {
    return new Response('ok');
  }

  if (requestEvents.length > 100) requestEvents.pop();

  const {event, purpose, ...data} = getRequestInfo(request);

  let description = request.url;

  if (event === 'subrequest') {
    description =
      decodeURIComponent(request.url)
        .match(/(query|mutation)\s+(\w+)/)?.[0]
        ?.replace(/\s+/, ' ') || request.url;
  }

  requestEvents.push({
    event: EVENT_MAP[event] || event,
    data: JSON.stringify({
      ...data,
      url: `${purpose} ${description}`.trim(),
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
