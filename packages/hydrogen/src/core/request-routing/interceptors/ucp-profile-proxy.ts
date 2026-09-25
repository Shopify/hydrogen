import { UCP_RE } from "../../url";
import type { HydrogenRouteInterceptor } from "../route-types";
import { createProxyInterceptor } from "./proxy";

// UCP requires at least 60s of freshness; limit stale signing keys to a further 300s.
const UCP_CACHE_CONTROL =
  "public, max-age=60, s-maxage=60, stale-while-revalidate=300, stale-if-error=300";
const UCP_NO_CACHE_CONTROL = "no-store";
const UCP_PROFILE_PATH = "/.well-known/ucp";
const UCP_FETCH_TIMEOUT_MS = 5_000;
// Accept is fixed upstream; its Vary header does not describe the downstream representation.
const UCP_RESPONSE_HEADERS = ["content-type", "etag", "last-modified"] as const;

const proxyUcpProfileRequest = createProxyInterceptor({
  match: UCP_RE,
  scope: "ucp-profile-proxy",
  timeoutMs: UCP_FETCH_TIMEOUT_MS,
  forwardSearch: false,
  rewritePathname: () => UCP_PROFILE_PATH,
  requestHeaders: {
    allow: ["if-none-match", "if-modified-since"],
    applyStorefrontHeaders: false,
    prepare: (headers) => {
      headers.set("accept", "application/json");
    },
  },
  responseHeaders: {
    allow: UCP_RESPONSE_HEADERS,
    prepare: (headers, { response }) => {
      headers.set(
        "cache-control",
        response.ok || response.status === 304 ? UCP_CACHE_CONTROL : UCP_NO_CACHE_CONTROL,
      );
    },
  },
  responseValidation: (upstream) => {
    if (upstream.status === 304) return null;
    if (upstream.status === 404) {
      return {
        status: 404,
        body: { error: "Shopify UCP profile not found" },
      };
    }

    const contentType = upstream.headers.get("content-type");
    const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
    // UCP profile hosting forbids redirects; 304 revalidation is handled above.
    const isRedirect = upstream.status >= 300 && upstream.status < 400;
    if (isRedirect || mediaType !== "application/json") {
      const status = isRedirect || upstream.ok ? 502 : upstream.status;
      return {
        status,
        body: { error: "Shopify UCP profile unavailable" },
        ...(status === 502 && {
          logMessage: "invalid profile response",
          log: { status: upstream.status, contentType },
        }),
      };
    }
    return null;
  },
  mapError: (error, phase) => ({
    status:
      phase === "fetch" && error instanceof DOMException && error.name === "TimeoutError"
        ? 504
        : undefined,
    body: { error: "Unable to fetch the Shopify UCP profile" },
  }),
});

export const handleUcpProfileProxy: HydrogenRouteInterceptor = (url, options) => {
  // Unlike reserved API routes, unsupported discovery methods fall through to the app.
  if (options.request.method !== "GET" && options.request.method !== "HEAD") return null;
  return proxyUcpProfileRequest(url, options);
};
