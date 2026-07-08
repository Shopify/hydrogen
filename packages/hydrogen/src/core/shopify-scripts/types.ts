import type { ShopifyGlobal } from "../../globals";
import type { I18nConfig } from "../headers";
import type { ShopifyRouteTemplates } from "../standard-routes/index";

export type ShopifyScriptsI18n = Pick<I18nConfig, "country" | "language"> &
  Partial<Pick<I18nConfig, "pathPrefix">>;

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
};

export type ShopifyScriptTagsOptions = {
  i18n?: ShopifyScriptsI18n;
  nonce?: string;
  shop?: ShopifyScriptsShop | null;
};

export type InitializeShopifyScriptsOptions = {
  navigate?: ShopifyGlobal["navigate"];
  routes: ShopifyRouteTemplates;
  webMcp?: boolean;
};

export type ShopifyScriptsOptions = ShopifyScriptTagsOptions & InitializeShopifyScriptsOptions;
