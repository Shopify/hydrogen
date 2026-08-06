import { getShopifyAnalyticsBusScript, getShopifyAnalyticsConfig } from "./analytics";
import { getShopifyConsentTrackingScript } from "./consent";
import {
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
import { getPerfKitScript, getPerfKitSpaBridgeScript } from "./perfkit";
import { renderShopifyScriptTag } from "./render";
import type {
  ShopifyLinkDescriptor,
  ShopifyScriptDescriptor,
  ShopifyScriptTagDescriptors,
  ShopifyScriptTagsOptions,
} from "./types";

export {
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
 * Returns grouped Shopify storefront script/link descriptors for SSR frameworks and bindings.
 *
 * Framework bindings wrap this with `initializeShopifyScripts()` to form their `ShopifyScripts`
 * component. Frameworks without a binding can render these descriptors during SSR and call
 * `initializeShopifyScripts()` during browser hydration.
 */
export function getShopifyScriptTags({
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

  // Keep this async consent library immediately before the inline consent bootstrap.
  // Parser-inserted async scripts execute in a later task, so the following inline
  // script can attach a load listener before the library runs.
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
  // This must run immediately after the consent library tag so it can find that
  // tag and attach its load listener before consent-tracking-api/privacy-banner executes.
  scripts.push({
    tagName: "script",
    attributes: { id: "shopify-consent-bootstrap", ...nonceAttributes },
    innerHTML: getShopifyConsentTrackingScript(consent),
  });

  // This must run after getShopifyConsentTrackingScript because that script
  // temporarily annotates visitorConsentCollected events for the analytics bus.
  scripts.push({
    tagName: "script",
    attributes: { id: "shopify-analytics-bus", ...nonceAttributes },
    innerHTML: getShopifyAnalyticsBusScript(analyticsConfig),
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
    scripts.push(getPerfKitSpaBridgeScript(nonceAttributes));
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
 * Renders all Shopify storefront script/link descriptors to HTML strings.
 */
export function renderShopifyScriptTags(options: ShopifyScriptTagsOptions): string[] {
  return getShopifyScriptTags(options).tags.map(renderShopifyScriptTag);
}
