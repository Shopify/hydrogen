import type { IncompleteShopifyGlobal, ShopifyGlobalConfig } from "./global";

export default function initializeShopifyGlobal(config: ShopifyGlobalConfig) {
  const shopifyWindow: { Shopify?: IncompleteShopifyGlobal } = window;
  const shopify = Object.assign((shopifyWindow.Shopify ??= {}), config, {
    // Configure Storefront Components in case they are used
    components: {
      config: {
        storeDomain: window.location.origin,
        country: config.country,
        language: config.locale,
      },
    },
  });

  // Privacy banner defaults to hostname, which drops protocol/port. Use the current
  // host for tokenless consent requests and legacy cookie domain inference.
  shopify.customerPrivacy.config.consentDomain = window.location.host;
}
