export type RequestLog = {
  event: string;
  data: string;
};

export type LogSubRequestProps = {
  query: string;
  requestHeaders: Record<string, string>;
  response: Response;
  startTime: number;
  displayName?: string;
};

export type ServerEvent = {
  id: string;
  url: string;
  startTime: number;
  endTime: number;
};

type StorefrontHeaders = {
  requestGroupId: string | null;
  buyerIp: string | null;
  cookie: string | null;
};

const requests: RequestLog[] = [];

export function logRequest({
  request,
  storefrontHeaders,
  startTime,
}: {
  request: Request;
  startTime: number;
  storefrontHeaders: StorefrontHeaders;
}) {
  if (requests.length > 100) requests.pop();

  requests.push({
    event: 'Request',
    data: JSON.stringify({
      id: storefrontHeaders.requestGroupId,
      url: `${
        request.headers.get('purpose') === 'prefetch' ? '(prefetch) ' : ''
      }${request.url}`,
      startTime,
      endTime: new Date().getTime(),
    }),
  });
}

export function logSubRequest({
  query,
  requestHeaders,
  response,
  startTime,
  displayName,
}: LogSubRequestProps) {
  if (requests.length > 100) requests.pop();

  const queryName = query.match(/query \w*/);
  const cacheStatus = response.headers.get('hydrogen-cache-status');
  const url = `${
    requestHeaders['purpose'] === 'prefetch' ? '(prefetch) ' : ''
  }${cacheStatus ? `${cacheStatus} ` : 'MISS '}${
    displayName || (queryName ? queryName[0] : 'query')
  }`;

  requests.push({
    event: 'Sub request',
    data: JSON.stringify({
      id: requestHeaders['Custom-Storefront-Request-Group-ID'],
      url,
      startTime,
      endTime: new Date().getTime(),
    }),
  });
}

export function getLoggedRequest() {
  return requests.pop();
}
