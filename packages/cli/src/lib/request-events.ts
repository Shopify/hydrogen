import type {Request, Response} from '@shopify/mini-oxygen';

export type RequestLog = {
  event: string;
  data: string;
};

export type LogSubRequestProps = {
  requestBody?: string;
  requestHeaders: Request['headers'];
  requestUrl: Request['url'];
  response: Response;
  startTime: number;
};

export type ServerEvent = {
  id: string;
  url: string;
  startTime: number;
  endTime: number;
};

const requests: RequestLog[] = [];

export function logRequestEvent({
  request,
  startTime,
}: {
  request: Request;
  startTime: number;
}) {
  if (requests.length > 100) requests.pop();

  requests.push({
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
  response,
  startTime,
}: LogSubRequestProps) {
  if (requests.length > 100) requests.pop();

  let queryName = requestUrl.includes('/graphql')
    ? requestBody?.match(/(query|mutation)\s+(\w+)/)?.[0]
    : undefined;

  queryName = queryName?.replace(/\s+/, ' ') || requestUrl;

  const cacheStatus = response.headers.get('hydrogen-cache-status');
  const url = `${
    requestHeaders.get('purpose') === 'prefetch' ? '(prefetch) ' : ''
  }${cacheStatus ? `${cacheStatus} ` : 'MISS '}${queryName}`;

  requests.push({
    event: 'Sub request',
    data: JSON.stringify({
      id: requestHeaders.get('Custom-Storefront-Request-Group-ID'),
      url,
      startTime,
      endTime: new Date().getTime(),
    }),
  });
}

export function getLoggedRequest() {
  return requests.pop();
}
