import { CUSTOMER_SESSION_COOKIE_NAME } from "./customer-session.ts";

export function requestForShopifyContext(request: Request): Request {
  return new Request(request.url, {
    method: request.method,
    headers: headersWithoutCustomerSession(request.headers),
    signal: request.signal,
  });
}

function headersWithoutCustomerSession(source: Headers): Headers {
  const headers = new Headers(source);
  const cookie = headers.get("cookie");
  if (!cookie) return headers;

  const forwardedCookies = cookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => !part.startsWith(`${CUSTOMER_SESSION_COOKIE_NAME}=`))
    .join("; ");

  if (forwardedCookies) headers.set("cookie", forwardedCookies);
  else headers.delete("cookie");

  return headers;
}
