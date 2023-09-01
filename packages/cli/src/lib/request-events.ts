import {ReadableStream} from 'node:stream/web';
import {Request, Response} from '@shopify/mini-oxygen';

type RequestEvent = {
  event: string;
  data: string;
};

export type LogSubRequestProps = {
  requestBody?: string;
  requestHeaders: Request['headers'];
  requestUrl: Request['url'];
  requestGroupId: string;
  response: Response;
  startTime: number;
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

export function logSubRequestEvent({
  requestBody,
  requestHeaders,
  requestUrl,
  requestGroupId,
  response,
  startTime,
}: LogSubRequestProps) {
  try {
    if (requestEvents.length > 100) requestEvents.pop();

    let queryName = requestBody?.match(/(query|mutation)\s+(\w+)/)?.[0];

    queryName = queryName?.replace(/\s+/, ' ') || requestUrl;

    let cacheStatus = response.headers.get('hydrogen-cache-status');
    if (!cacheStatus) {
      cacheStatus = requestHeaders.get('hydrogen-cache-status');
    }

    let url = requestUrl;
    if (requestHeaders.get) {
      url = `${
        requestHeaders.get('purpose') === 'prefetch' ? '(prefetch) ' : ''
      }${queryName}`;
    } else {
      url = queryName;
    }

    requestEvents.push({
      event: 'Sub request',
      data: JSON.stringify({
        id: requestGroupId,
        url,
        cacheStatus: cacheStatus || '',
        startTime,
        endTime: new Date().getTime(),
      }),
    });
  } catch (e) {
    console.log(e);
  }
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
      }, 50);

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
