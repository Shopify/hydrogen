import { UCP_RE } from "../../url";
import { createProxyInterceptor } from "./proxy";

const UCP_CACHE_CONTROL =
  "public, max-age=60, s-maxage=60, stale-while-revalidate=300, stale-if-error=86400";
const UCP_NO_CACHE_CONTROL = "no-store";
const UCP_PROFILE_PATH = "/.well-known/ucp";
const UCP_FETCH_TIMEOUT_MS = 5_000;
const UCP_RESPONSE_HEADERS = ["content-type", "etag", "last-modified", "vary"] as const;

export const handleUcpProxy = createProxyInterceptor({
  match: UCP_RE,
  methods: ["GET"],
  scope: "ucp-proxy",
  timeoutMs: UCP_FETCH_TIMEOUT_MS,
  forwardSearch: false,
  rewritePathname: () => UCP_PROFILE_PATH,
  requestHeaders: {
    allow: [],
    applyStorefrontHeaders: false,
    prepare: (headers) => {
      headers.set("accept", "application/json");
    },
  },
  responseHeaders: {
    mode: { allow: UCP_RESPONSE_HEADERS },
    consumeStorefrontHeaders: false,
    inject: (upstream) => ({
      "cache-control": upstream.ok ? UCP_CACHE_CONTROL : UCP_NO_CACHE_CONTROL,
    }),
  },
  responseValidation: (upstream) => {
    const contentType = upstream.headers.get("content-type");
    const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
    if (
      (upstream.status >= 300 && upstream.status < 400) ||
      (upstream.ok && mediaType !== "application/json")
    ) {
      return {
        status: 502,
        body: { error: "Invalid Shopify UCP profile response" },
        headers: { "cache-control": UCP_NO_CACHE_CONTROL },
        logMessage: "invalid profile response",
        log: { status: upstream.status, contentType },
      };
    }
    return null;
  },
  mapError: (error) => ({
    status: error instanceof DOMException && error.name === "TimeoutError" ? 504 : 502,
    headers: { "cache-control": UCP_NO_CACHE_CONTROL },
  }),
  formatError: () => ({ error: "Unable to fetch the Shopify UCP profile" }),
});
