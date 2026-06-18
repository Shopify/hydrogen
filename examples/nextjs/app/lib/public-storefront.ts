import { storefrontConfig } from "@shared/config";
import { createStorefrontClient } from "@shopify/hydrogen";

// Browser-safe client: holds only the public access token, which Shopify
// throttles per client IP, so each shopper gets their own bucket. Use it for
// interactive client-side fetches from Client Components (e.g. TanStack Query
// or SWR): predictive search, "load more" pagination, availability polling.
// Example: a useQuery({ queryFn: () => publicStorefrontClient.graphql(...) }).
//
// To authenticate from the browser the token must be inlined into the client
// bundle via a `NEXT_PUBLIC_*` env var; with the shared config below it falls
// back to the demo store's public token.
export const publicStorefrontClient = createStorefrontClient({
  type: "public",
  config: {
    storeDomain: storefrontConfig.storeDomain,
    i18n: storefrontConfig.i18n,
    publicStorefrontToken: storefrontConfig.publicStorefrontToken,
  },
});
