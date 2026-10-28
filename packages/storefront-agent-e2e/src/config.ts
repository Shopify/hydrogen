import { isCountryCode, type CountryCode } from "./storefront-api";

/** Stagehand attaches to the Chrome that Playwright launches here, so both drive one page. */
export const CDP_PORT = Number(process.env.STOREFRONT_AGENT_CDP_PORT ?? "9333");

export type RunConfig = {
  /** The storefront under test. */
  readonly storefrontBaseUrl: string;
  /** The shop's myshopify domain, used for tokenless Storefront API discovery. */
  readonly shopDomain: string;
  /** The market the storefront resolves; discovery probes carts in this country. */
  readonly country: CountryCode;
  /** Picks among eligible target variants so runs are reproducible. */
  readonly seed: number;
  /** Where this storefront serves a product page; {handle} is replaced. Only the product-page start uses it. */
  readonly productPathTemplate: string;
};

export function readRunConfig(): RunConfig {
  const storefrontBaseUrl = requireEnv("STOREFRONT_BASE_URL");
  const shopDomain = requireEnv("STOREFRONT_SHOP_DOMAIN");
  const country = process.env.STOREFRONT_COUNTRY?.trim() || "US";
  if (!isCountryCode(country)) {
    throw new Error("STOREFRONT_COUNTRY must be an ISO 3166-1 alpha-2 code, e.g. US.");
  }
  const seed = Number(process.env.STOREFRONT_AGENT_SEED ?? "0");
  if (!Number.isInteger(seed) || seed < 0) {
    throw new Error("STOREFRONT_AGENT_SEED must be a non-negative integer.");
  }
  const productPathTemplate = process.env.STOREFRONT_PRODUCT_PATH?.trim() || "/products/{handle}";
  if (!productPathTemplate.includes("{handle}")) {
    throw new Error("STOREFRONT_PRODUCT_PATH must contain {handle}, e.g. /products/{handle}.");
  }
  return {
    storefrontBaseUrl: new URL(storefrontBaseUrl).toString(),
    shopDomain,
    country,
    seed,
    productPathTemplate,
  };
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}
