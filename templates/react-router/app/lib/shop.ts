// ─────────────────────────────────────────────────────────────────────────────
// Store configuration.
//
// Mode is auto-detected per request (see `useMockShop` below):
//   • Real store — used automatically whenever a PRIVATE Storefront API token is
//     present. On Oxygen, a linked storefront injects PRIVATE_STOREFRONT_API_TOKEN
//     and PUBLIC_STORE_DOMAIN; for local real-store dev set them in `.env`.
//   • mock.shop — the tokenless fallback used when no token is present (so a
//     fresh deploy always renders), and forced explicitly by MOCK_SHOP=1.
//
// `storeDomain` below is the default used only when PUBLIC_STORE_DOMAIN is unset.
// It points at Shopify's public Hydrogen Preview store as an EXAMPLE — replace it
// or set PUBLIC_STORE_DOMAIN. (mock.shop is a different data source.)
// ─────────────────────────────────────────────────────────────────────────────

export const storefrontConfig = {
  storeDomain: "hydrogen-preview.myshopify.com", // ← default; or set PUBLIC_STORE_DOMAIN
  i18n: { country: "US", language: "EN" },
} as const;

// Real store iff a private Storefront API token is available; otherwise the
// tokenless mock.shop demo. MOCK_SHOP=1 forces mock (used by the gate + as the
// zero-config default).
export function useMockShop(
  env: Pick<Env, "MOCK_SHOP" | "PRIVATE_STOREFRONT_API_TOKEN">,
): boolean {
  return env.MOCK_SHOP === "1" || !env.PRIVATE_STOREFRONT_API_TOKEN;
}

// Store domain for real-store mode: prefer the worker env (Oxygen injects
// PUBLIC_STORE_DOMAIN for a linked storefront), else the configured default.
export function getStoreDomain(env: Pick<Env, "PUBLIC_STORE_DOMAIN">): string {
  return env.PUBLIC_STORE_DOMAIN || storefrontConfig.storeDomain;
}

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

// Private Storefront API token for SSR requests. Read from the worker environment
// so a standalone clone supplies it via .env / Oxygen bindings. Never commit a
// real token.
export function getPrivateStorefrontToken(env: Pick<Env, "PRIVATE_STOREFRONT_API_TOKEN">): string {
  const token = env.PRIVATE_STOREFRONT_API_TOKEN;
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
