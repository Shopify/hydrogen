import {
  SHOPIFY_CDN_ORIGIN,
  SHOPIFY_SHOP_APP_ORIGIN,
  SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
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
  SHOPIFY_PERF_KIT_SCRIPT,
  SHOPIFY_SHOP_APP_ORIGIN,
  SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
  SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT,
  SHOPIFY_STOREFRONT_WEBMCP_SCRIPT,
} from "./constants";
export { getShopifyGlobal, getShopifyGlobalBootstrapScript } from "./global";
export { initializeShopifyScripts } from "./initialize";
export { renderShopifyScriptTag } from "./render";
export { loadShopifyWebMcpTools } from "./webmcp";
export type {
  InitializeShopifyScriptsOptions,
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
  i18n,
  nonce,
  shop,
}: ShopifyScriptTagsOptions = {}): ShopifyScriptTagDescriptors {
  const nonceAttributes = nonce ? { nonce } : undefined;

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
      attributes: nonceAttributes,
      innerHTML: getShopifyGlobalBootstrapScript({ i18n }),
    },
    {
      tagName: "script",
      attributes: {
        src: SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
        type: "module",
        crossorigin: "anonymous",
        ...nonceAttributes,
      },
    },
  ];
  const perfKitScript = getPerfKitScript(shop);
  if (perfKitScript) {
    scripts.push(perfKitScript);
    scripts.push(getPerfKitSpaBridgeScript(nonce));
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
