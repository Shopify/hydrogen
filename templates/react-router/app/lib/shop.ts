// ─────────────────────────────────────────────────────────────────────────────
// Store configuration. This is the ONE place to point the example at your store.
//
// The values below point at Shopify's public Hydrogen Preview store as an
// EXAMPLE — REPLACE them with your own store, and set PRIVATE_STOREFRONT_API_TOKEN
// in your environment (see .env.example). Real-store (non-mock) mode needs a
// PRIVATE Storefront API token for YOUR store — it is not zero-config.
//
// The zero-config path is MOCK_SHOP=1 (`MOCK_SHOP=1 pnpm dev`): it routes to the
// public mock.shop API, needs no token, and ignores everything here. (mock.shop
// is a different data source than the Hydrogen Preview store.)
// ─────────────────────────────────────────────────────────────────────────────

export const storefrontConfig = {
  storeDomain: "hydrogen-preview.myshopify.com", // ← replace with your store
  i18n: { country: "US", language: "EN" },
} as const;

// Analytics shop identity. `shopId` is a real Shopify Shop GID.
export const analyticsShop = {
  shopId: "gid://shopify/Shop/55145660472", // ← replace with your Shop GID
  acceptedLanguage: "EN",
  currency: "USD",
  hydrogenSubchannelId: "1000014875", // ← replace with your storefront id
} as const;

// Consent config. This example renders its own (CORE) consent banner, so the
// analytics bus runs in "custom-banner" mode (loads only the Customer Privacy
// API; our banner drives setTrackingConsent()).
export const analyticsConsent = {
  mode: "custom-banner",
  country: "US",
  language: "EN",
} as const;

// Private Storefront API token for SSR requests. Read from the environment so a
// standalone clone supplies it via .env (the dev/start scripts auto-load it) or
// the host's environment. Never commit a real token.
export function getPrivateStorefrontToken(): string {
  const token = process.env.PRIVATE_STOREFRONT_API_TOKEN;
  if (!token) {
    throw new Error(
      "PRIVATE_STOREFRONT_API_TOKEN is required for SSR requests against a real store. " +
        "Set it in your environment (see .env.example), or run with MOCK_SHOP=1 for the tokenless mock.shop demo.",
    );
  }
  return token;
}

// Buyer IP for private Storefront clients (Shopify uses it for bot/abuse
// signals). Returns the first trusted forwarded IP; falls back to localhost in
// development and throws in production when none is present.
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
