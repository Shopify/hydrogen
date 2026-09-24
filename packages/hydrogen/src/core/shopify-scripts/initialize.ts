import { initializeCustomConsent } from "../analytics/custom-consent";
import { getLogger } from "../logging";
import { configureShopifyRouting } from "./global";
import { initializeShopifyPageViewEvents } from "./page-view";
import type { InitializeShopifyScriptsOptions } from "./types";
import { loadShopifyWebMcpTools } from "./webmcp";

const log = getLogger("consent");

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

  if (consent?.mode === "custom-banner") {
    if (typeof consent.setup !== "function") {
      log.warn(
        "custom-banner requires a consent.setup callback; analytics delivery remains blocked until setup completes",
      );
    } else {
      try {
        initializeCustomConsent(consent.setup);
      } catch (error) {
        log.error("custom consent initialization failed", { error });
      }
    }
  }

  if (!webMcp) return Promise.resolve();

  return loadShopifyWebMcpTools();
}
