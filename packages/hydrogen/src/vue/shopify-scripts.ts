import { defineComponent, h, onMounted, type PropType } from "vue";

import {
  getShopifyScriptTags,
  initializeShopifyScripts,
  type ShopifyScriptsShop,
  type ShopifyScriptsI18n,
  type ShopifyScriptTagsOptions,
  type ShopifyRoutesOptions,
} from "../core/shopify-scripts/index";

export type ShopifyScriptsProps = ShopifyScriptTagsOptions & {
  navigate?: ShopifyRoutesOptions["navigate"];
  routes?: ShopifyRoutesOptions["routes"];
  webMcp?: boolean;
};

const i18nProp: PropType<ShopifyScriptsI18n> = Object;
const navigateProp: PropType<NonNullable<ShopifyRoutesOptions["navigate"]>> | null = null;
const routesProp: PropType<NonNullable<ShopifyRoutesOptions["routes"]>> | null = null;
const shopProp: PropType<ShopifyScriptsShop> = Object;
const consentProp: PropType<ShopifyScriptTagsOptions["consent"]> = Object;
const analyticsProp: PropType<ShopifyScriptTagsOptions["analytics"]> = Object;
const debugProp: PropType<ShopifyScriptTagsOptions["debug"]> = Object;
const inboxProp: PropType<ShopifyScriptTagsOptions["inbox"]> = [Boolean, Object];

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
    shop: {
      type: shopProp,
      required: true,
    },
  },
  setup(props) {
    onMounted(() => {
      void initializeShopifyScripts({
        navigate: props.navigate,
        routes: props.routes,
        webMcp: props.webMcp !== false,
      });
    });

    return () =>
      getShopifyScriptTags({
        analytics: props.analytics,
        consent: props.consent,
        debug: props.debug,
        i18n: props.i18n,
        nonce: props.nonce,
        shop: props.shop,
        inbox: props.inbox ?? undefined,
      }).tags.map(({ tagName, attributes, innerHTML }) =>
        h(tagName, {
          ...attributes,
          ...(innerHTML ? { innerHTML } : {}),
        }),
      );
  },
});
