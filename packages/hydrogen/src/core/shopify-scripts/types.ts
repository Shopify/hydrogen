import type { ShopifyGlobal } from "../../globals";
import type {
  ConsentConfig,
  ShopAnalyticsChannel,
  StorefrontAnalyticsConfig,
} from "../analytics/types";
import type { I18nConfig } from "../request-context";
import type { ShopifyRouteTemplates } from "../standard-routes/index";

/** The sales channel and custom data for the analytics bus. */
export type ShopifyScriptsAnalyticsConfig = {
  /** The sales channel that Shopify attributes analytics to. Defaults to `"hydrogen"`. */
  channel?: ShopAnalyticsChannel;
  /** Extra values that analytics destinations can read from the bus configuration. */
  customData?: StorefrontAnalyticsConfig["customData"];
};

/** The locale that Shopify's scripts read from the browser's Shopify global. */
export type ShopifyScriptsI18n = Pick<I18nConfig, "country" | "language"> &
  Partial<Pick<I18nConfig, "pathPrefix">> & {
    /** The active currency code. Hydrogen converts it to uppercase. */
    currency?: string;
  };

// DOM types expose element properties such as `crossOrigin`, but these descriptors represent
// serialized HTML attributes such as `crossorigin` so they work outside React. Attribute values are
// kept narrow where JSX runtimes define stricter unions for serialized HTML attributes.
export type ShopifyAttributeValue = boolean | string;
/** The values of the HTML `crossorigin` attribute. */
type ShopifyCrossOrigin = "" | "anonymous" | "use-credentials";
/** Custom `data-*` HTML attributes with string values. */
type ShopifyDataAttributes = {
  [name: `data-${string}`]: string;
};

/** The HTML attributes of a generated script tag, with lowercase attribute names. */
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

/** The HTML attributes of a generated link tag. */
export type ShopifyLinkTagAttributes = Partial<{
  /** The resource type for a prefetch link. Always `"script"`. */
  as: "script";
  /** The CORS mode for fetching the linked resource. */
  crossorigin: ShopifyCrossOrigin;
  /** The URL of the origin to preconnect to, or the script to prefetch. */
  href: string;
  /** Whether the link preconnects to an origin or prefetches a script. */
  rel: "preconnect" | "prefetch";
}>;

/** A script tag to render in the document head. */
export type ShopifyScriptDescriptor = {
  /** Always `"script"` for a script tag. */
  tagName: "script";
  /** The script tag's HTML attributes, such as its source URL and nonce. */
  attributes?: ShopifyScriptTagAttributes;
  /** The inline script content, for scripts that have no source URL. */
  innerHTML?: string;
};

/** A link tag to render in the document head. */
export type ShopifyLinkDescriptor = {
  /** Always `"link"` for a link tag. */
  tagName: "link";
  attributes: ShopifyLinkTagAttributes;
  /** Link tags have no content. */
  innerHTML?: never;
};

/** A script or link tag to render in the document head. */
export type ShopifyScriptTagDescriptor = ShopifyScriptDescriptor | ShopifyLinkDescriptor;

/** The generated link and script tags, as separate lists and as one combined list. */
export type ShopifyScriptTagDescriptors = {
  /** Link descriptors for framework head APIs that split links from scripts. */
  readonly links: readonly ShopifyLinkDescriptor[];
  /** Script descriptors for framework head APIs that split scripts from links. */
  readonly scripts: readonly ShopifyScriptDescriptor[];
  /** All generated descriptors as a mixed list, with links before scripts. */
  readonly tags: readonly ShopifyScriptTagDescriptor[];
};

/** The shop identifiers that Shopify's scripts and analytics use. */
export type ShopifyScriptsShop = {
  /** The shop's ID, as a numeric string or a Shop GID. */
  shopId: string;
  /** The Hydrogen storefront's ID. Hydrogen leaves it out of Headless channel analytics. */
  storefrontId: string;
  /** The shop's permanent `*.myshopify.com` domain. Hydrogen sets it as `window.Shopify.shop`. */
  myshopifyDomain: string;
};

/** The shop details and the features whose scripts to load. */
export type ShopifyScriptTagsOptions = {
  /**
   * Loads the customer account component. Render `<shopify-account>` where you want the account UI to appear.
   * @see [shopify-account](https://shopify.dev/docs/api/storefront-web-components/components/shopify-account)
   */
  account?: boolean;
  /** The sales channel and custom data for the analytics bus. */
  analytics?: ShopifyScriptsAnalyticsConfig;
  /** Which consent script to load and how the analytics bus waits for consent. */
  consent?: ConsentConfig;
  /** Development-only debugging tools. */
  debug?: {
    /** Loads Shopify's standard events inspector in development builds. */
    standardEventsInspector?: boolean;
  };
  /** The country, language, currency, and path prefix for Shopify's scripts. Defaults to US English. */
  i18n?: ShopifyScriptsI18n;
  /** Loads Inbox. Render `<shopify-chat>` where you want the chat UI to appear. */
  inbox?: boolean;
  /**
   * Adds a `nonce` attribute to every script tag.
   */
  nonce?: string;
  /** The shop's IDs and permanent domain. */
  shop: ShopifyScriptsShop;
  /** Loads Shopify's storefront analytics script. Defaults to `true`. */
  shopifyAnalytics?: boolean;
};

/**
 * Route settings for Shopify's scripts: the storefront's route templates and a callback for
 * client-side navigation.
 */
export type ShopifyRoutesOptions = {
  /**
   * Navigates to a URL after Shopify's scripts resolve it to your app's route. Defaults to a full
   * page load. Checkout, cart permalink, and customer account paths always use a full page load.
   */
  navigate?: ShopifyGlobal["routes"]["navigate"];
  /** Your app's custom route templates, which Shopify's scripts use to match and resolve storefront URLs. */
  routes?: ShopifyRouteTemplates;
};

/** The route, consent, and WebMCP settings for starting Shopify's scripts in the browser. */
export type InitializeShopifyScriptsOptions = ShopifyRoutesOptions & {
  /** The consent configuration that you passed to the script tags. The bus runs the setup callback once. */
  consent?: ConsentConfig;
  /** Loads Shopify WebMCP tools when the browser supports WebMCP. Defaults to `true`. */
  webMcp?: boolean;
};

/**
 * Options for both getShopifyScriptTags and initializeShopifyScripts. Build one object and pass
 * it to both functions.
 *
 * @publicDocs
 */
export type ShopifyScriptsOptions = ShopifyScriptTagsOptions & InitializeShopifyScriptsOptions;
