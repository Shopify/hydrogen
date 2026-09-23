import { getLogger } from "./logging";

const log = getLogger("public-request");

const FORWARDED_HOST_HEADER = "x-forwarded-host";
const FORWARDED_PROTO_HEADER = "x-forwarded-proto";
const FORWARDED_PROTOCOLS: ReadonlySet<string> = new Set(["http", "https"]);
const MUTATION_METHODS: ReadonlySet<string> = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export type CreatePublicRequestOptions = {
  /**
   * Whether `x-forwarded-host` and `x-forwarded-proto` come from a proxy chain you control.
   *
   * Clients can send these headers themselves, and Hydrogen's `localHttps` Vite plugin keeps
   * values that are already present so a tunnel's headers survive. Only trust them when every
   * request reaches the app through proxies that set them: for example during development, or
   * behind your own reverse proxy in production. Oxygen already passes the public URL as
   * `request.url`, so production Oxygen deployments do not need to trust forwarded headers.
   */
  trustForwardedHeaders: boolean;
};

/**
 * Returns a request whose `request.url` is the URL the buyer's browser used.
 *
 * Call this at the server entry, before handing the request to a framework. Behind a reverse
 * proxy that terminates TLS, the server sees an internal URL such as `http://localhost:3000`
 * while the browser sends a public `Origin` such as `https://shop.example`. Framework CSRF
 * checks that compare `Origin` against `request.url` (React Router 7.18 and later, and 8) then
 * reject every mutation, and Hydrogen builds redirects and Customer Account OAuth URLs from the
 * internal origin. Those framework checks run before route middleware, so normalizing the URL
 * inside middleware is too late.
 *
 * When `trustForwardedHeaders` is `true`, the first value of `x-forwarded-host` replaces the
 * host (including port) and the first value of `x-forwarded-proto` (`http` or `https`) replaces
 * the scheme. If either header is malformed, neither is applied. Method, headers, body, and
 * signal are preserved. The original request is returned when the URL does not change.
 */
export function createPublicRequest(
  request: Request,
  options: CreatePublicRequestOptions,
): Request {
  const publicUrl = options.trustForwardedHeaders ? getForwardedUrl(request) : null;
  const publicRequest =
    publicUrl && publicUrl.href !== request.url ? new Request(publicUrl, request) : request;

  if (__DEV__) warnOnOriginMismatch(publicRequest, options);

  return publicRequest;
}

function getForwardedUrl(request: Request): URL | null {
  const url = new URL(request.url);
  const forwardedProto = readForwardedHeader(request.headers, FORWARDED_PROTO_HEADER);
  const forwardedHost = readForwardedHeader(request.headers, FORWARDED_HOST_HEADER);
  if (!forwardedProto && !forwardedHost) return null;

  const protocol = forwardedProto?.toLowerCase() ?? url.protocol.slice(0, -1);
  if (!FORWARDED_PROTOCOLS.has(protocol)) {
    if (__DEV__)
      log.warn("ignoring unsupported x-forwarded-proto value", { value: forwardedProto });
    return null;
  }

  const authority = parseAuthority(protocol, forwardedHost ?? url.host);
  if (!authority) {
    if (__DEV__) log.warn("ignoring malformed x-forwarded-host value", { value: forwardedHost });
    return null;
  }

  // Assign through setters: resolving the path against a new base would let a path such as
  // `//attacker.example/cart` replace the host.
  // `port` is assigned separately because the `host` setter keeps the old port when the new
  // host has none.
  url.protocol = authority.protocol;
  url.hostname = authority.hostname;
  url.port = authority.port;
  return url;
}

function readForwardedHeader(headers: Headers, name: string): string | undefined {
  const value = headers.get(name)?.split(",")[0]?.trim();
  return value ? value : undefined;
}

function parseAuthority(protocol: string, host: string): URL | null {
  try {
    const url = new URL(`${protocol}://${host}`);
    const isBareAuthority =
      !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
    return isBareAuthority && url.host ? url : null;
  } catch {
    return null;
  }
}

function warnOnOriginMismatch(request: Request, options: CreatePublicRequestOptions): void {
  if (!MUTATION_METHODS.has(request.method)) return;

  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return;

  const requestOrigin = new URL(request.url).origin;
  let originHeader: string;
  try {
    originHeader = new URL(origin).origin;
  } catch {
    return;
  }
  if (originHeader === requestOrigin) return;

  log.warn(
    "request.url origin does not match the Origin header; frameworks that compare them, such as React Router 7.18+, may reject this mutation with 400 Bad Request",
    {
      origin: originHeader,
      requestOrigin,
      trustForwardedHeaders: options.trustForwardedHeaders,
      hint: options.trustForwardedHeaders
        ? "if this is a same-site request behind a proxy, make sure the proxy sets x-forwarded-host and x-forwarded-proto to the public host and scheme"
        : "if a proxy you control sets x-forwarded-host and x-forwarded-proto, pass trustForwardedHeaders: true",
    },
  );
}
