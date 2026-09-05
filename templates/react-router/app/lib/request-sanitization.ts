import { CUSTOMER_SESSION_COOKIE_NAME } from "./customer-session";

const FORWARDED_HOST_HEADER = "x-forwarded-host";
const FORWARDED_PROTO_HEADER = "x-forwarded-proto";
const HTTPS_PROTOCOL = "https:";
const LOCAL_HTTPS_HOST = "local.tryhydrogen.dev";
const LOCAL_REQUEST_HOSTS = new Set(["127.0.0.1", "::1", "localhost", LOCAL_HTTPS_HOST]);

export function createPublicRequest(request: Request): Request {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get(FORWARDED_HOST_HEADER);
  const forwardedProto = request.headers.get(FORWARDED_PROTO_HEADER);

  if (!LOCAL_REQUEST_HOSTS.has(url.hostname) || !forwardedHost || forwardedProto !== "https") {
    return request;
  }

  let forwardedUrl: URL;
  try {
    forwardedUrl = new URL(`${HTTPS_PROTOCOL}//${forwardedHost}`);
  } catch {
    return request;
  }
  if (forwardedUrl.hostname !== LOCAL_HTTPS_HOST) return request;

  url.host = forwardedUrl.host;
  url.protocol = HTTPS_PROTOCOL;
  if (url.toString() === request.url) return request;
  return new Request(url, request);
}

export function requestForShopifyContext(request: Request): Request {
  const cookie = request.headers.get("cookie");
  if (!cookie?.includes(`${CUSTOMER_SESSION_COOKIE_NAME}=`)) return request;

  const requestCopy = request.clone();
  const headers = new Headers(request.headers);

  const forwardedCookies = cookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => !part.startsWith(`${CUSTOMER_SESSION_COOKIE_NAME}=`))
    .join("; ");

  if (forwardedCookies) headers.set("cookie", forwardedCookies);
  else headers.delete("cookie");

  const init: RequestInit & { duplex: "half" } = {
    body: requestCopy.body,
    duplex: "half",
    headers,
    method: requestCopy.method,
    redirect: requestCopy.redirect,
    signal: requestCopy.signal,
  };
  return new Request(requestCopy.url, init);
}
