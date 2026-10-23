import { storefrontConfig } from "../../shared/config";

const MOCK_SHOP_DOMAIN = "mock.shop";

type RuntimeEnv = Record<string, string | undefined>;

export type StorefrontModeConfig = {
  mode: "mock" | "private";
  storeDomain: string;
};

export type ResolvedStorefrontConfig =
  | { mode: "mock"; storeDomain: string }
  | { mode: "private"; storeDomain: string; privateStorefrontToken: string };

export function resolveStorefrontConfig(env: RuntimeEnv): ResolvedStorefrontConfig {
  const configuredDomain = env.PUBLIC_STORE_DOMAIN;
  const privateStorefrontToken = env.PRIVATE_STOREFRONT_API_TOKEN;
  const mockDomain =
    configuredDomain && isMockShopDomain(configuredDomain) ? configuredDomain : undefined;

  if (env.MOCK_SHOP === "1" || !privateStorefrontToken || mockDomain) {
    return {
      mode: "mock",
      storeDomain: mockDomain || MOCK_SHOP_DOMAIN,
    };
  }

  // The private token, Customer Account, and Shopify script identity all belong to the shared store.
  // Ignore non-mock domain overrides so the Storefront client can't move to another store alone.
  return {
    mode: "private",
    storeDomain: storefrontConfig.storeDomain,
    privateStorefrontToken,
  };
}

function isMockShopDomain(domain: string): boolean {
  return domain === MOCK_SHOP_DOMAIN || domain.endsWith(`.${MOCK_SHOP_DOMAIN}`);
}
