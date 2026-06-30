import { storefrontConfig } from "./config";
import { getOptionalPrivateStorefrontToken } from "./private-env";
import {
  createStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
  type StorefrontRequestContext,
} from "@shopify/hydrogen";

let warnedAboutPublicFallback = false;

/**
 * Builds the Storefront API client shared by every framework example.
 *
 * With a private token set, it creates a `type: "private"` client to exercise
 * the buyer-isolated SSR path. Without one — the default for a fresh clone — it
 * falls back to the public token committed in `config.ts` so the examples render
 * the `hydrogen-preview` demo store with zero setup.
 *
 * To exercise the private path, set `PRIVATE_STOREFRONT_API_TOKEN` (and point
 * `examples/shared/config.ts` at your own store).
 *
 * The return type is the private client every example and SDK helper (cart
 * routes, redirects) is typed against. The public fallback is structurally
 * identical — same `graphql`/`requestContext` surface, and the demo store's
 * public token is valid for these SSR reads, cart, and redirect queries — and
 * nothing branches on the client's `type` discriminant, so the cast is safe.
 */
export function createExampleStorefrontClient(opts: {
  requestContext: StorefrontRequestContext;
  buyerIp: string;
}): RequestScopedPrivateStorefrontClient {
  const privateStorefrontToken = getOptionalPrivateStorefrontToken();

  if (privateStorefrontToken) {
    return createStorefrontClient({
      type: "private",
      config: {
        storeDomain: storefrontConfig.storeDomain,
        i18n: storefrontConfig.i18n,
        privateStorefrontToken,
        buyerIp: opts.buyerIp,
        requestContext: opts.requestContext,
      },
    });
  }

  if (!warnedAboutPublicFallback) {
    warnedAboutPublicFallback = true;
    console.warn(
      "[examples] PRIVATE_STOREFRONT_API_TOKEN is not set — using the public Storefront " +
        "token for the hydrogen-preview demo store. Set PRIVATE_STOREFRONT_API_TOKEN to " +
        "exercise the private (buyer-isolated SSR) path.",
    );
  }

  const publicClient = createStorefrontClient({
    type: "public",
    config: {
      storeDomain: storefrontConfig.storeDomain,
      i18n: storefrontConfig.i18n,
      publicStorefrontToken: storefrontConfig.publicStorefrontToken,
      requestContext: opts.requestContext,
    },
  });

  return publicClient as unknown as RequestScopedPrivateStorefrontClient;
}
