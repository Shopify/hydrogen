import {ReadableStream} from 'node:stream/web';
import {Request, Response} from '@shopify/mini-oxygen';

type RequestEvent = {
  event: string;
  data: string;
};

const requestEvents: RequestEvent[] = [];

export function logRequestEvent({
  request,
  startTime,
}: {
  request: Request;
  startTime: number;
}) {
  if (requestEvents.length > 100) requestEvents.pop();

  requestEvents.push({
    event: 'Request',
    data: JSON.stringify({
      id: request.headers.get('request-id')!,
      url: `${
        request.headers.get('purpose') === 'prefetch' ? '(prefetch) ' : ''
      }${request.url}`,
      startTime,
      endTime: new Date().getTime(),
    }),
  });
}

export function logSubRequestEvent(request: Request) {
  if (requestEvents.length > 100) requestEvents.pop();

  let queryName = decodeURIComponent(request.url).match(
    /(query|mutation)\s+(\w+)/,
  )?.[0];

  queryName = queryName?.replace(/\s+/, ' ') || request.url;

  const cacheStatus = request.headers.get('hydrogen-cache-status');
  const url = `${
    request.headers.get('purpose') === 'prefetch' ? '(prefetch) ' : ''
  }${cacheStatus ? `${cacheStatus} ` : 'MISS '}${queryName}`;

  requestEvents.push({
    event: 'Sub request',
    data: JSON.stringify({
      id: request.headers.get('request-id')!,
      url,
      startTime: request.headers.get('hydrogen-start-time'),
      endTime: request.headers.get('hydrogen-end-time') || Date.now(),
    }),
  });

  // Dummy response for service bindings
  return Promise.resolve(new Response('ok'));
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
