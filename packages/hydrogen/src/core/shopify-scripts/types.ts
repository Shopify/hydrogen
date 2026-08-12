import type { ShopifyGlobal } from "../../globals";
import type {
  ConsentConfig,
  ShopAnalyticsChannel,
  StorefrontAnalyticsConfig,
} from "../analytics/types";
import type { I18nConfig } from "../request-context";
import type { ShopifyRouteTemplates } from "../standard-routes/index";

export type ShopifyScriptsAnalyticsConfig = {
  channel?: ShopAnalyticsChannel;
  customData?: StorefrontAnalyticsConfig["customData"];
};

export type ShopifyScriptsI18n = Pick<I18nConfig, "country" | "language"> &
  Partial<Pick<I18nConfig, "pathPrefix">> & {
    currency?: string;
  };

export type ShopifyScriptsI18nWithCurrency = ShopifyScriptsI18n & {
  /**
   * Active currency code, exposed as `window.Shopify.currency.active`. Required when Shopify
   * analytics is enabled: product events carry prices, and a price without a currency is
   * meaningless. Product pages can be viewed before the cart initializes, so the currency cannot
   * be sourced from the cart.
   */
  currency: string;
};

// DOM types expose element properties such as `crossOrigin`, but these descriptors represent
// serialized HTML attributes such as `crossorigin` so they work outside React. Attribute values are
// kept narrow where JSX runtimes define stricter unions for serialized HTML attributes.
export type ShopifyAttributeValue = boolean | string;
type ShopifyCrossOrigin = "" | "anonymous" | "use-credentials";
type ShopifyDataAttributes = {
  [name: `data-${string}`]: string;
};

export type ShopifyScriptTagAttributes = ShopifyDataAttributes &
  Partial<{
    async: boolean;
    crossorigin: ShopifyCrossOrigin;
    defer: boolean;
    id: string;
    nonce: string;
    src: string;
    type: string;
  }>;

export type ShopifyLinkTagAttributes = Partial<{
  as: "script";
  crossorigin: ShopifyCrossOrigin;
  href: string;
  rel: "preconnect" | "prefetch";
}>;

export type ShopifyScriptDescriptor = {
  tagName: "script";
  attributes?: ShopifyScriptTagAttributes;
  innerHTML?: string;
};

export type ShopifyLinkDescriptor = {
  tagName: "link";
  attributes: ShopifyLinkTagAttributes;
  innerHTML?: never;
};

export type ShopifyScriptTagDescriptor = ShopifyScriptDescriptor | ShopifyLinkDescriptor;

export type ShopifyScriptTagDescriptors = {
  /** Link descriptors for framework head APIs that split links from scripts. */
  readonly links: readonly ShopifyLinkDescriptor[];
  /** Script descriptors for framework head APIs that split scripts from links. */
  readonly scripts: readonly ShopifyScriptDescriptor[];
  /** All generated descriptors as a mixed list, with links before scripts. */
  readonly tags: readonly ShopifyScriptTagDescriptor[];
};

export type ShopifyScriptsShop = {
  shopId: string;
  storefrontId: string;
  /** The shop's permanent `*.myshopify.com` domain, exposed as `window.Shopify.shop`. */
  myshopifyDomain: string;
};

type ShopifyScriptTagsBaseOptions = {
  analytics?: ShopifyScriptsAnalyticsConfig;
  consent?: ConsentConfig;
  debug?: {
    /** Loads Shopify's standard events inspector in development builds. */
    standardEventsInspector?: boolean;
  };
  /** Loads Inbox. Render `<shopify-chat>` where you want the chat UI to appear. */
  inbox?: boolean;
  nonce?: string;
  shop: ShopifyScriptsShop;
};

// Discriminated on `shopifyAnalytics` so enabling Shopify analytics (the default) requires
// `i18n.currency` at compile time instead of failing at runtime in the analytics script.
export type ShopifyScriptTagsOptions =
  | (ShopifyScriptTagsBaseOptions & {
      i18n: ShopifyScriptsI18nWithCurrency;
      /** Shopify analytics is enabled by default and requires `i18n.currency`. */
      shopifyAnalytics?: true;
    })
  | (ShopifyScriptTagsBaseOptions & {
      i18n?: ShopifyScriptsI18n;
      shopifyAnalytics: false;
    });

export type ShopifyRoutesOptions = {
  navigate?: ShopifyGlobal["routes"]["navigate"];
  routes?: ShopifyRouteTemplates;
};

export type InitializeShopifyScriptsOptions = ShopifyRoutesOptions & {
  webMcp?: boolean;
};

export type ShopifyScriptsOptions = ShopifyScriptTagsOptions & InitializeShopifyScriptsOptions;
