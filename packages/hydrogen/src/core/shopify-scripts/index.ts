import { getShopifyAnalyticsBusScript, getShopifyAnalyticsConfig } from "./analytics";
import {
  SHOPIFY_ACCOUNT_SCRIPT,
  SHOPIFY_CONSENT_API_SCRIPT,
  SHOPIFY_CDN_ORIGIN,
  SHOPIFY_CONSENT_SCRIPT_ID,
  SHOPIFY_PRIVACY_BANNER_SCRIPT,
  SHOPIFY_SHOP_APP_ORIGIN,
  SHOPIFY_INBOX_SCRIPT,
  SHOPIFY_STOREFRONT_ANALYTICS_SCRIPT,
  SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
  SHOPIFY_STOREFRONT_STANDARD_EVENTS_INSPECTOR_SCRIPT,
  SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT,
} from "./constants";
import { getShopifyGlobalBootstrapScript } from "./global";
import { getPerfKitScript } from "./perfkit";
import { renderShopifyScriptTag } from "./render";
import type {
  ShopifyLinkDescriptor,
  ShopifyScriptDescriptor,
  ShopifyScriptTagDescriptors,
  ShopifyScriptTagsOptions,
} from "./types";

export {
  CONSENT_TRACKING_API_LOADED_EVENT,
  SHOPIFY_ACCOUNT_SCRIPT,
  SHOPIFY_CDN_ORIGIN,
  SHOPIFY_CONSENT_API_SCRIPT,
  SHOPIFY_PERF_KIT_SCRIPT,
  SHOPIFY_PRIVACY_BANNER_SCRIPT,
  SHOPIFY_SHOP_APP_ORIGIN,
  SHOPIFY_INBOX_SCRIPT,
  SHOPIFY_STOREFRONT_ANALYTICS_SCRIPT,
  SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
  SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT,
  SHOPIFY_STOREFRONT_WEBMCP_SCRIPT,
  VISITOR_CONSENT_COLLECTED_EVENT,
} from "./constants";
export { getShopifyGlobal, getShopifyGlobalBootstrapScript } from "./global";
export { initializeShopifyScripts } from "./initialize";
export { renderShopifyScriptTag } from "./render";
export type {
  ShopifyScriptsAnalyticsConfig,
  ShopifyRoutesOptions,
  ShopifyScriptTagDescriptor,
  ShopifyScriptTagDescriptors,
  ShopifyScriptTagsOptions,
  ShopifyScriptsOptions,
  ShopifyScriptsI18n,
  ShopifyScriptsShop,
} from "./types";

/**
 * Returns Shopify's storefront script and link tags as descriptors.
 *
 * Render the descriptors in the document head during server rendering, then call
 * initializeShopifyScripts in the browser. Keep the tags in the returned order. The inline
 * scripts set up globals that later scripts read.
 *
 * @param options - The shop details, the localization, the consent configuration, and the features whose scripts to load.
 * @returns The link tags, the script tags, and a combined list with links first.
 * @publicDocs
 */
// oxlint-disable-next-line complexity -- ordered assembly of optional Shopify script tags; each flag adds one branch and splitting would obscure the required load order
export function getShopifyScriptTags({
  account = false,
  analytics,
  consent,
  debug,
  i18n,
  nonce,
  shop,
  shopifyAnalytics = true,
  inbox = false,
}: ShopifyScriptTagsOptions): ShopifyScriptTagDescriptors {
  const nonceAttributes = nonce !== undefined ? { nonce } : undefined;
  const analyticsConfig = getShopifyAnalyticsConfig({ analytics, consent, shop });

  const links: ShopifyLinkDescriptor[] = [
    {
      tagName: "link",
      attributes: {
        rel: "preconnect",
        href: SHOPIFY_CDN_ORIGIN,
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "preconnect",
        href: SHOPIFY_SHOP_APP_ORIGIN,
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "prefetch",
        as: "script",
        href: SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT,
        crossorigin: "anonymous",
      },
    },
  ];
  const scripts: ShopifyScriptDescriptor[] = [
    {
      tagName: "script",
      attributes: { id: "shopify-global-bootstrap", ...nonceAttributes },
      innerHTML: getShopifyGlobalBootstrapScript({ i18n, shop }),
    },
    {
      tagName: "script",
      attributes: {
        id: "shopify-standard-actions",
        type: "module",
        crossorigin: "anonymous",
        ...nonceAttributes,
        src: SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
      },
    },
  ];

  if (__DEV__ && debug?.standardEventsInspector) {
    scripts.push({
      tagName: "script",
      attributes: {
        id: "shopify-standard-events-inspector",
        defer: true,
        crossorigin: "anonymous",
        ...nonceAttributes,
        src: SHOPIFY_STOREFRONT_STANDARD_EVENTS_INSPECTOR_SCRIPT,
      },
    });
  }

  if (inbox) {
    scripts.push({
      tagName: "script",
      attributes: {
        id: "shopify-inbox",
        type: "module",
        async: true,
        crossorigin: "anonymous",
        ...nonceAttributes,
        src: SHOPIFY_INBOX_SCRIPT,
      },
    });
  }

  if (account) {
    scripts.push({
      tagName: "script",
      attributes: {
        id: "shopify-account",
        type: "module",
        async: true,
        crossorigin: "anonymous",
        ...nonceAttributes,
        src: SHOPIFY_ACCOUNT_SCRIPT,
      },
    });
  }

  // Install readiness listeners before loading the async consent library so a
  // cached script cannot finish initialization before Hydrogen starts listening.
  scripts.push({
    tagName: "script",
    attributes: { id: "shopify-analytics-bus", ...nonceAttributes },
    innerHTML: getShopifyAnalyticsBusScript(analyticsConfig),
  });

  scripts.push({
    tagName: "script",
    attributes: {
      id: SHOPIFY_CONSENT_SCRIPT_ID,
      async: true,
      crossorigin: "anonymous",
      ...nonceAttributes,
      src:
        consent?.mode === "default-banner"
          ? SHOPIFY_PRIVACY_BANNER_SCRIPT
          : SHOPIFY_CONSENT_API_SCRIPT,
    },
  });

  if (shopifyAnalytics) {
    scripts.push({
      tagName: "script",
      attributes: {
        id: "shopify-storefront-analytics",
        async: true,
        crossorigin: "anonymous",
        ...nonceAttributes,
        src: SHOPIFY_STOREFRONT_ANALYTICS_SCRIPT,
      },
    });
  }

  const perfKitScript = getPerfKitScript(shop, nonceAttributes);
  if (perfKitScript) {
    scripts.push(perfKitScript);
  }

  return {
    links,
    scripts,
    get tags() {
      return [...links, ...scripts];
    },
  };
}

/**
 * Renders Shopify's storefront script and link tags to HTML strings.
 *
 * Use the function when your framework accepts raw HTML in the document head.
 *
 * @param options The shop details and the features, such as account and analytics, whose scripts to load.
 * @returns One HTML string per tag, with link tags first.
 * @publicDocs
 */
export function renderShopifyScriptTags(options: ShopifyScriptTagsOptions): string[] {
  return getShopifyScriptTags(options).tags.map(renderShopifyScriptTag);
}
