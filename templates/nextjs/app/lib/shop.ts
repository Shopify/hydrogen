// ─────────────────────────────────────────────────────────────────────────────
// Store configuration.
//
// Mode is auto-detected per request (see `useMockShop` below):
//   • Real store — used automatically whenever a PRIVATE Storefront API token is
//     present. On Vercel, set PRIVATE_STOREFRONT_API_TOKEN and PUBLIC_STORE_DOMAIN
//     in project environment variables; for local real-store dev set them in `.env`.
//   • mock.shop — the tokenless fallback used when no token is present (so a
//     fresh deploy always renders), and forced explicitly by MOCK_SHOP=1.
//
// `storeDomain` below is the default used only when PUBLIC_STORE_DOMAIN is unset.
// It points at Shopify's public Hydrogen Preview store as an EXAMPLE — replace it
// or set PUBLIC_STORE_DOMAIN. (mock.shop is a different data source.)
// ─────────────────────────────────────────────────────────────────────────────

export const storefrontConfig = {
  storeDomain: "hydrogen-preview.myshopify.com",
  i18n: { country: "US", language: "EN" },
} as const;

// Analytics shop identity. The Hydrogen sales channel populates SHOP_ID and
// PUBLIC_STOREFRONT_ID for a linked store (e.g. via `shopify hydrogen env pull`,
// or set them in `.env` / your host's project env). We read those and fall back
// to the public Hydrogen Preview store so a fresh, tokenless deploy still renders.
function toShopGid(shopId: string): string {
  return shopId.startsWith("gid://") ? shopId : `gid://shopify/Shop/${shopId}`;
}

export const analyticsShop = {
  shopId: process.env.SHOP_ID
    ? toShopGid(process.env.SHOP_ID)
    : "gid://shopify/Shop/55145660472",
  acceptedLanguage: "EN",
  currency: "USD",
  hydrogenSubchannelId: process.env.PUBLIC_STOREFRONT_ID || "1000014875",
} as const;

export const analyticsConsent = {
  mode: "custom-banner",
  country: "US",
  language: "EN",
} as const;

export function useMockShop(
  env:
    | { MOCK_SHOP?: string; PRIVATE_STOREFRONT_API_TOKEN?: string }
    | Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  return env.MOCK_SHOP === "1" || !env.PRIVATE_STOREFRONT_API_TOKEN;
}

// Store domain for real-store mode: prefer PUBLIC_STORE_DOMAIN from the
// environment (set it in `.env` locally or in your host's project env vars), else
// fall back to the configured default above.
export function getStoreDomain(
  env:
    | { PUBLIC_STORE_DOMAIN?: string }
    | Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string {
  return env.PUBLIC_STORE_DOMAIN || storefrontConfig.storeDomain;
}

export function getPrivateStorefrontToken(
  env:
    | { PRIVATE_STOREFRONT_API_TOKEN?: string }
    | Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string {
  const token = env.PRIVATE_STOREFRONT_API_TOKEN;
  if (!token) {
    throw new Error(
      "PRIVATE_STOREFRONT_API_TOKEN is required for SSR requests against a real store. " +
        "Set it in your environment (see .env.example), or run with MOCK_SHOP=1 for the tokenless mock.shop demo.",
    );
  }
  return token;
}

const BUYER_IP_HEADERS = ["oxygen-buyer-ip", "cf-connecting-ip", "x-forwarded-for"] as const;
export const DEVELOPMENT_BUYER_IP = "127.0.0.1";

export function getBuyerIp(headers: Pick<Headers, "get">): string {
  for (const header of BUYER_IP_HEADERS) {
    const ip = headers.get(header)?.split(",")[0]?.trim();
    if (ip) return ip;
  }
  if (process.env.NODE_ENV !== "production") return DEVELOPMENT_BUYER_IP;
  throw new Error(`${BUYER_IP_HEADERS.join(", ")} is required for private Storefront API clients`);
}