import { computed, defineComponent, h, onMounted, watch, type PropType } from "vue";

import { findShopifyAccountWidgetDataScript } from "../core/shopify-scripts/account-widget";
import {
  getShopifyScriptTags,
  initializeShopifyScripts,
  type ShopifyScriptsShop,
  type ShopifyScriptsI18n,
  type ShopifyScriptTagsOptions,
  type ShopifyRoutesOptions,
} from "../core/shopify-scripts/index";
import { restartAccountWidgets } from "./account-widget";

/**
 * Props for the Vue ShopifyScripts component.
 *
 * @publicDocs
 */
export type ShopifyScriptsProps = ShopifyScriptTagsOptions & {
  navigate?: ShopifyRoutesOptions["navigate"];
  routes?: ShopifyRoutesOptions["routes"];
  webMcp?: boolean;
};

type CompletePropOptions<T> = {
  [K in keyof T]-?: unknown;
};

const i18nProp: PropType<ShopifyScriptsI18n> = Object;
const navigateProp: PropType<NonNullable<ShopifyRoutesOptions["navigate"]>> | null = null;
const routesProp: PropType<NonNullable<ShopifyRoutesOptions["routes"]>> | null = null;
const shopProp: PropType<ShopifyScriptsShop> = Object;
const consentProp: PropType<ShopifyScriptTagsOptions["consent"]> = Object;
const analyticsProp: PropType<ShopifyScriptTagsOptions["analytics"]> = Object;
const debugProp: PropType<ShopifyScriptTagsOptions["debug"]> = Object;
const inboxProp: PropType<ShopifyScriptTagsOptions["inbox"]> = Boolean;
const accountWidgetProp: PropType<ShopifyScriptTagsOptions["accountWidget"]> = Object;

/**
 * Renders Shopify's script tags during server rendering and starts the scripts once, when the
 * component mounts.
 *
 * @publicDocs
 */
export const ShopifyScripts = defineComponent({
  name: "ShopifyScripts",
  props: {
    i18n: {
      type: i18nProp,
      default: undefined,
    },
    nonce: {
      type: String,
      default: undefined,
    },
    routes: {
      type: routesProp,
      default: undefined,
    },
    navigate: {
      type: navigateProp,
      default: undefined,
    },
    consent: {
      type: consentProp,
      default: undefined,
    },
    analytics: {
      type: analyticsProp,
      default: undefined,
    },
    debug: {
      type: debugProp,
      default: undefined,
    },
    webMcp: {
      type: Boolean,
      default: undefined,
    },
    inbox: {
      type: inboxProp,
      default: undefined,
    },
    accountWidget: {
      type: accountWidgetProp,
      default: undefined,
    },
    shopifyAnalytics: {
      type: Boolean,
      default: undefined,
    },
    shop: {
      type: shopProp,
      required: true as const,
    },
  } satisfies CompletePropOptions<ShopifyScriptsProps>,
  setup(props) {
    onMounted(() => {
      void initializeShopifyScripts({
        consent: props.consent,
        navigate: props.navigate,
        routes: props.routes,
        webMcp: props.webMcp !== false,
      });
    });

    const scriptTags = computed(() => getShopifyScriptTags(props));

    // `flush: "post"` runs after the JSON script tag updates, so remounted widgets read the new data.
    watch(
      () => findShopifyAccountWidgetDataScript(scriptTags.value.scripts)?.innerHTML,
      restartAccountWidgets,
      { flush: "post" },
    );

    return () =>
      scriptTags.value.tags.map(({ tagName, attributes, innerHTML }) =>
        h(tagName, {
          ...attributes,
          ...(innerHTML ? { innerHTML } : {}),
        }),
      );
  },
});
