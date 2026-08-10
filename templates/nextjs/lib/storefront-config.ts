import { storefrontConfig } from "./config";
import { getOptionalPrivateStorefrontToken } from "./env";

/**
 * Shared Storefront config resolver with mock.shop fallback
 * (`hydrogen-storefront-client` + the example's zero-secrets contract).
 *
 * Used by both client factories (`storefront.ts` for the per-buyer cart-seed
 * client, `storefront-static.ts` for the shared-rate-limit catalog client) and
 * by `proxy.ts` so the request handlers hit the same store as the RSC data
 * path.
 *
 * When no `PRIVATE_STOREFRONT_API_TOKEN` is provisioned, the client falls back
 * to the public mock.shop endpoint using its well-known `mock-private-token`.
 * With a real private token present, `NEXT_PUBLIC_STORE_DOMAIN` must identify
 * the store.
 */

export const MOCK_SHOP_DOMAIN = "mock.shop";
export const MOCK_SHOP_PRIVATE_TOKEN = "mock-private-token";
const SESSION_SECRET_MIN_LENGTH = 32;

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
  return (
    storeDomain !== MOCK_SHOP_DOMAIN &&
    Boolean(process.env.NEXT_PUBLIC_SHOP_ID) &&
    Boolean(process.env.NEXT_PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID) &&
    Boolean(process.env.SITE_ORIGIN) &&
    Boolean(
      process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= SESSION_SECRET_MIN_LENGTH,
    )
  );
}

export function resolveStorefrontConfig(): ResolvedStorefrontConfig {
  const privateStorefrontToken = getOptionalPrivateStorefrontToken();

  if (!privateStorefrontToken) {
    if (!mockShopFallbackWarned) {
      mockShopFallbackWarned = true;
      console.warn(
        `[hydrogen-template-nextjs] No PRIVATE_STOREFRONT_API_TOKEN found — ` +
          `running against mock.shop (${MOCK_SHOP_DOMAIN}). Set ` +
          `PRIVATE_STOREFRONT_API_TOKEN and NEXT_PUBLIC_STORE_DOMAIN to hit a real store.`,
      );
    }
    return {
      storeDomain: MOCK_SHOP_DOMAIN,
      privateStorefrontToken: MOCK_SHOP_PRIVATE_TOKEN,
    };
  }

  const storeDomain = storefrontConfig.storeDomain;
  if (!storeDomain) {
    throw new Error(
      "NEXT_PUBLIC_STORE_DOMAIN is required when PRIVATE_STOREFRONT_API_TOKEN is set.",
    );
  }
  return { storeDomain, privateStorefrontToken };
}
