import { Cache, createFetchWithCache } from "@shopify/hydrogen";
import type { LoaderFunctionArgs } from "react-router";

const CACHE_NAME = "hydrogen-e2e-subrequest-cache";
const QUERY = `#graphql
  query HydrogenSubrequestCacheE2E($country: CountryCode)
    @inContext(country: $country) {
    shop {
      name
    }
  }
`;

export async function loader({ context, request }: LoaderFunctionArgs) {
  if (process.env.NODE_ENV !== "development") {
    throw new Response(null, { status: 404 });
  }

  const url = new URL(request.url);
  const cacheKey = url.searchParams.get("key") ?? "default";
  const country = url.searchParams.get("country") ?? "US";
  const body = JSON.stringify({
    query: QUERY,
    variables: { country },
  });
  const fetchWithCache = createFetchWithCache({
    cache: await caches.open(CACHE_NAME),
    waitUntil: context.waitUntil,
  });

  return fetchWithCache(
    context.storefront.apiUrl,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Shopify-Storefront-Access-Token": context.env.PUBLIC_STOREFRONT_API_TOKEN,
      },
      body,
    },
    {
      key: ["e2e-subrequest-cache", cacheKey, context.storefront.apiUrl, body],
      strategy: Cache.long(),
      shouldCacheResponse: async ({ json }) => {
        const payload = await json?.().catch(() => undefined);

        return (
          typeof payload === "object" &&
          payload != null &&
          !Array.isArray(payload) &&
          "data" in payload &&
          !("errors" in payload)
        );
      },
    },
  );
}
