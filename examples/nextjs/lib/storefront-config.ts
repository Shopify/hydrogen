import "server-only";
import { storefrontConfig } from "@shared/config";
import { getOptionalSharedSecret } from "@shared/private-env";

/**
 * Shared Storefront config resolver with mock.shop fallback
 * (`hydrogen-storefront-client` + the example's zero-secrets contract).
 *
 * Used by both client factories (`storefront.ts` for the per-buyer cart-seed
 * client, `storefront-static.ts` for the shared-rate-limit catalog client) and
 * by `proxy.ts` so the request handlers hit the same store as the RSC data
 * path.
 *
 * When no `PRIVATE_STOREFRONT_API_TOKEN` is provisioned (local dev without the
 * decrypted ejson secrets), the client falls back to the public mock.shop
 * endpoint using its well-known `mock-private-token` so the example runs with
 * zero secrets. With a real private token present, the configured store is used
 * unchanged (an optional `PUBLIC_STORE_DOMAIN` env override lets local dev
 * point at a specific store without re-deriving the shared config).
 */

export const MOCK_SHOP_DOMAIN = "mock.shop";
export const MOCK_SHOP_PRIVATE_TOKEN = "mock-private-token";

export type ResolvedStorefrontConfig = {
  storeDomain: string;
  privateStorefrontToken: string;
};

let mockShopFallbackWarned = false;

/** Whether Customer Accounts are enabled for the resolved storefront.
 *
 * Sync on purpose: `resolveStorefrontConfig` is sync, and keeping this sync
 * removes the risk of a forgotten `await` producing a `Promise<boolean>`
 * that's always truthy when spread into `handlers` (which would silently
 * register the customer account handlers on mock.shop). Poka-yoke. */
export function isCustomerAccountsAvailable(): boolean {
  const { storeDomain } = resolveStorefrontConfig();
  return storeDomain !== MOCK_SHOP_DOMAIN;
}

export function resolveStorefrontConfig(): ResolvedStorefrontConfig {
  const privateStorefrontToken = getOptionalSharedSecret("PRIVATE_STOREFRONT_API_TOKEN");

  if (!privateStorefrontToken) {
    if (!mockShopFallbackWarned) {
      mockShopFallbackWarned = true;
      console.warn(
        `[hydrogen-example-nextjs] No PRIVATE_STOREFRONT_API_TOKEN found — ` +
          `running against mock.shop (${MOCK_SHOP_DOMAIN}). Decrypt secrets ` +
          `(pnpm examples:secrets:decrypt) to hit a real store.`,
      );
    }
    return {
      storeDomain: MOCK_SHOP_DOMAIN,
      privateStorefrontToken: MOCK_SHOP_PRIVATE_TOKEN,
    };
  }

  const storeDomain = process.env.PUBLIC_STORE_DOMAIN ?? storefrontConfig.storeDomain;
  return { storeDomain, privateStorefrontToken };
}
