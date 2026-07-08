const DEFAULT_REQUEST_METHOD = "GET";
const DEFAULT_REQUEST_PATH = "/";
const DEFAULT_REQUEST_HOST = "localhost";
const HTTPS_PROTOCOL = "https";
const HTTP_PROTOCOL = "http";
const HEADER_VALUE_SEPARATOR = ",";

type RequestHeaderValue = string | string[] | undefined;
type ResponseHeaderValue = number | string | string[] | undefined;

type NuxtRequestEvent = {
  method?: string;
  path?: string;
  headers: Headers;
  node: {
    req: {
      method?: string;
      url?: string;
      originalUrl?: string;
      headers: Record<string, RequestHeaderValue>;
      connection?: unknown;
    };
    res: {
      getHeader(name: string): ResponseHeaderValue;
      setHeader(name: string, value: number | string | string[]): void;
    };
  };
};

export function createNuxtWebRequest(event: NuxtRequestEvent): Request {
  return new Request(getRequestUrl(event), {
    method: event.method ?? event.node.req.method ?? DEFAULT_REQUEST_METHOD,
    headers: new Headers(event.headers),
  });
}

export function setNuxtResponseHeader(
  event: NuxtRequestEvent,
  name: string,
  value: number | string | string[],
) {
  event.node.res.setHeader(name, value);
}

export function appendNuxtResponseHeader(event: NuxtRequestEvent, name: string, value: string) {
  event.node.res.setHeader(name, [
    ...normalizeResponseHeader(event.node.res.getHeader(name)),
    value,
  ]);
}

export function applyNuxtResponseHeaders(event: NuxtRequestEvent, headers: Headers) {
  const cacheControl = headers.get("cache-control");
  if (cacheControl) setNuxtResponseHeader(event, "cache-control", cacheControl);

  for (const cookie of headers.getSetCookie()) {
    appendNuxtResponseHeader(event, "set-cookie", cookie);
  }
}

function getRequestUrl(event: NuxtRequestEvent): URL {
  const requestPath =
    event.node.req.originalUrl ?? event.path ?? event.node.req.url ?? DEFAULT_REQUEST_PATH;
  return new URL(requestPath, `${getRequestProtocol(event)}://${getRequestHost(event)}`);
}

function getRequestHost(event: NuxtRequestEvent): string {
  return (
    getForwardedHeader(event.node.req.headers["x-forwarded-host"]) ??
    getForwardedHeader(event.node.req.headers.host) ??
    DEFAULT_REQUEST_HOST
  );
}

function getRequestProtocol(event: NuxtRequestEvent): string {
  return (
    getForwardedHeader(event.node.req.headers["x-forwarded-proto"]) ??
    (isEncryptedConnection(event.node.req.connection) ? HTTPS_PROTOCOL : HTTP_PROTOCOL)
  );
}

function isEncryptedConnection(connection: unknown): boolean {
  return (
    typeof connection === "object" &&
    connection !== null &&
    "encrypted" in connection &&
    connection.encrypted === true
  );
}

function getForwardedHeader(value: RequestHeaderValue): string | undefined {
  const header = Array.isArray(value) ? value[0] : value;
  return header?.split(HEADER_VALUE_SEPARATOR)[0]?.trim() || undefined;
}

function normalizeResponseHeader(value: ResponseHeaderValue): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value != null) return [String(value)];
  return [];
}
