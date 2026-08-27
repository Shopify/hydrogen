import { getLogger } from "../../logging";
import { UCP_RE } from "../../url";
import type { HydrogenRouteInterceptor } from "../route-types";

const UCP_CACHE_CONTROL =
  "public, max-age=60, s-maxage=60, stale-while-revalidate=300, stale-if-error=86400";
const UCP_NO_CACHE_CONTROL = "no-store";
const UCP_PROFILE_PATH = "/.well-known/ucp";
const UCP_FETCH_TIMEOUT_MS = 5_000;
const UCP_RESPONSE_HEADERS = ["content-type", "etag", "last-modified", "vary"] as const;

const log = getLogger("ucp-proxy");

/**
 * Serves Shopify's managed UCP business profile from the headless storefront origin.
 */
export const handleUcpProxy: HydrogenRouteInterceptor = (url, { request, storefrontClient }) => {
  if (!UCP_RE.test(url.pathname) || request.method !== "GET") return null;

  const upstreamUrl = new URL(UCP_PROFILE_PATH, storefrontClient.storeUrl);

  return fetch(upstreamUrl, {
    headers: { accept: "application/json" },
    redirect: "manual",
    signal: AbortSignal.timeout(UCP_FETCH_TIMEOUT_MS),
  })
    .then((upstreamResponse) => {
      const contentType = upstreamResponse.headers.get("content-type");
      const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
      if (
        (upstreamResponse.status >= 300 && upstreamResponse.status < 400) ||
        (upstreamResponse.ok && mediaType !== "application/json")
      ) {
        log.error("invalid profile response", {
          status: upstreamResponse.status,
          contentType,
        });
        return Response.json(
          { error: "Invalid Shopify UCP profile response" },
          { headers: { "cache-control": UCP_NO_CACHE_CONTROL }, status: 502 },
        );
      }

      const headers = new Headers({
        "cache-control": upstreamResponse.ok ? UCP_CACHE_CONTROL : UCP_NO_CACHE_CONTROL,
      });

      for (const name of UCP_RESPONSE_HEADERS) {
        const value = upstreamResponse.headers.get(name);
        if (value) headers.set(name, value);
      }

      return new Response(upstreamResponse.body, {
        headers,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
      });
    })
    .catch((error) => {
      log.error("request failed", { error });
      const status = error instanceof DOMException && error.name === "TimeoutError" ? 504 : 502;
      return Response.json(
        { error: "Unable to fetch the Shopify UCP profile" },
        { headers: { "cache-control": UCP_NO_CACHE_CONTROL }, status },
      );
    });
};
