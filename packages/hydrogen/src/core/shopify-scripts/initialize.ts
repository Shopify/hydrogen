import { initializeCustomConsent } from "../analytics/custom-consent";
import { configureShopifyRouting } from "./global";
import { initializeShopifyPageViewEvents } from "./page-view";
import type { InitializeShopifyScriptsOptions } from "./types";
import { loadShopifyWebMcpTools } from "./webmcp";

/**
 * Initializes Shopify browser script behavior for frameworks without a Hydrogen binding.
 *
 * This is the browser hydration half of `getShopifyScriptTags()`: framework bindings combine both
 * into a `ShopifyScripts` component, while custom integrations can render script tags during SSR
 * and call this helper from their browser lifecycle.
 */
export function initializeShopifyScripts({
  consent,
  navigate,
  routes,
  webMcp = true,
}: InitializeShopifyScriptsOptions): Promise<boolean | void> {
  configureShopifyRouting({ navigate, routes });
  initializeShopifyPageViewEvents();

  if (consent?.mode === "custom-banner") initializeCustomConsent(consent.setup);

  if (!webMcp) return Promise.resolve();

  return loadShopifyWebMcpTools();
}
