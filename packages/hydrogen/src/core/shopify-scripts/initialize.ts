import { initializeCustomConsent } from "../analytics/custom-consent";
import { getLogger } from "../logging";
import { configureShopifyRouting } from "./global";
import { initializeShopifyPageViewEvents } from "./page-view";
import type { InitializeShopifyScriptsOptions } from "./types";
import { loadShopifyWebMcpTools } from "./webmcp";

const log = getLogger("consent");

/**
 * Starts Shopify's scripts in the browser for frameworks without a Hydrogen binding. Call it after
 * hydration, with the consent configuration that you passed to getShopifyScriptTags.
 *
 * The function configures `window.Shopify.routes` and dispatches a Standard Events page view on
 * load and after each navigation that changes the path or query. The function hands a
 * `custom-banner` setup callback to the analytics bus, which runs the callback after the consent
 * API loads. When `webMcp` isn't `false` and the browser supports WebMCP, the function loads
 * Shopify's WebMCP tools.
 *
 * A `custom-banner` configuration without a setup callback logs a warning, and analytics delivery
 * stays blocked.
 *
 * @param options - The consent configuration, the route settings, and whether to load WebMCP tools.
 * @returns A promise that resolves after the WebMCP tools load or fail to load, or right away when the function skips WebMCP.
 *
 * @publicDocs
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
