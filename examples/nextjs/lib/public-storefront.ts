import { defaultI18n, storefrontConfig } from "@shared/config";
import { createShopifyRequestContext, createStorefrontClient } from "@shopify/hydrogen";

/**
 * Browser-safe public Storefront client (`hydrogen-storefront-client` /
 * `references/nextjs.md` "Public client"). Holds only the **public** Storefront
 * API access token, which Shopify throttles per client IP, so each shopper gets
 * their own bucket. Safe to import from Client Components — it carries no
 * private token and no request-scoped state.
 *
 * Use it for interactive client-side Storefront fetches from Client Components
 * (e.g. TanStack Query / SWR): predictive autocomplete, "load more" pagination,
 * availability polling. Example:
 *
 *   // in a "use client" component
 *   useQuery({
 *     queryKey: ["search", term],
 *     queryFn: () => publicStorefrontClient.graphql(SEARCH, { variables: { term } }),
 *   });
 *
 * The current example routes browser predictive search through the same-origin
 * `/api/predictive-search` handler (registered in `proxy.ts`) rather than
 * calling Storefront directly, so this client is provided as the sanctioned
 * pattern for future client-side GraphQL — not dead code. For server-side
 * (RSC/route-handler) fetches, use `getStorefrontClient()` (per-buyer) or
 * `staticStorefrontClient` (shared rate limit) from `lib/storefront.ts` /
 * `lib/storefront-static.ts` instead.
 *
 * NB: `@shared/config` only inlines public values (store domain + public token)
 * and a local-dev session-secret placeholder; it is safe to bundle. Production
 * apps should source the public token from a `NEXT_PUBLIC_*` env var.
 */
const requestContext = createShopifyRequestContext({
  // Static request context — no `headers()`, no buyer IP. The public client is
  // per-IP-throttled by Shopify, not per-buyer.
  request: { headers: new Headers() },
  i18n: defaultI18n,
});

export const publicStorefrontClient = createStorefrontClient({
  type: "public",
  requestContext,
  config: {
    storeDomain: storefrontConfig.storeDomain,
    publicStorefrontToken: storefrontConfig.publicStorefrontToken ?? "",
  },
});
