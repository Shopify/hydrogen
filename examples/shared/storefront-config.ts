import { storefrontConfig } from "./config";
import { getOptionalSharedSecret } from "./private-env";

/**
 * Zero-secrets Storefront config resolver shared by the `poc/*` examples.
 *
 * When no `PRIVATE_STOREFRONT_API_TOKEN` is provisioned (local dev without the
 * decrypted ejson secrets — the default for anyone outside Shopify), the
 * examples fall back to the public [mock.shop](https://mock.shop) endpoint
 * using its well-known `mock-private-token`, so a fresh clone renders instead
 * of throwing on every SSR request. With a real private token present, the
 * configured store is used unchanged (`PUBLIC_STORE_DOMAIN` overrides the
 * bundled demo store domain).
 *
 * mock.shop accepts `mock-private-token` for the private-client auth header, so
 * callers keep `type: "private"` and the request-scoped private client contract
 * their handlers and page loaders are typed against.
 *
 * This is the shared counterpart to the framework examples' own resolvers
 * (`examples/nextjs/lib/storefront-config.ts`,
 * `examples/react-router/app/lib/storefront-middleware.ts`), which stay local to
 * those apps because they also gate Customer Accounts on the same signal.
 */

export const MOCK_SHOP_DOMAIN = "mock.shop";
export const MOCK_SHOP_PRIVATE_TOKEN = "mock-private-token";

export type ResolvedStorefrontConfig = {
  storeDomain: string;
  privateStorefrontToken: string;
  /**
   * True when falling back to mock.shop. mock.shop has no Customer Account API
   * and no HTTPS origin for the OAuth callback, so account sign-in is
   * unavailable in this mode.
   */
  usingMockShop: boolean;
};

let mockShopFallbackWarned = false;

/**
 * @param exampleName Package-ish label used in the fallback warning, e.g. `"hydrogen-example-astro"`.
 * @param env Framework-supplied env bag (SvelteKit's `$env/dynamic/private`,
 *   Nitro's runtime env, …) for runtimes where `process.env` isn't populated.
 */
export function resolveStorefrontConfig(
  exampleName: string,
  env?: object | null,
): ResolvedStorefrontConfig {
  const privateStorefrontToken = getOptionalSharedSecret("PRIVATE_STOREFRONT_API_TOKEN", env);

  if (!privateStorefrontToken) {
    if (!mockShopFallbackWarned) {
      mockShopFallbackWarned = true;
      console.warn(
        `[${exampleName}] No PRIVATE_STOREFRONT_API_TOKEN found — ` +
          `running against mock.shop (${MOCK_SHOP_DOMAIN}). Decrypt secrets ` +
          `(pnpm examples:secrets:decrypt) to hit a real store.`,
      );
    }
    return {
      storeDomain: MOCK_SHOP_DOMAIN,
      privateStorefrontToken: MOCK_SHOP_PRIVATE_TOKEN,
      usingMockShop: true,
    };
  }

  const storeDomain =
    getOptionalSharedSecret("PUBLIC_STORE_DOMAIN", env) ?? storefrontConfig.storeDomain;

  return { storeDomain, privateStorefrontToken, usingMockShop: false };
}
