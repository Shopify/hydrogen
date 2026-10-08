import { defineComponent, h } from "vue";

import {
  defineShopPayButton,
  getShopPayButtonDeclarativeShadowDomHtml,
  getShopPayButtonElementAttributes,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

/**
 * Props for the Vue ShopPayButton component.
 *
 * @publicDocs
 */
export type ShopPayButtonProps = ShopPayButtonOptions;

type CompletePropOptions<T> = {
  [K in keyof T]-?: unknown;
};

const canUseDom = typeof document !== "undefined";
defineShopPayButton();

/**
 * Renders the Shop Pay button custom element. During server rendering, the component outputs
 * declarative shadow DOM, which displays the button before scripts load.
 *
 * The component takes the createShopPayButton options as Vue props. The component renders no slot content and drops extra attributes, including `class` and `style`. Vue templates can pass the props in kebab-case, such as `border-radius` and `accessibility-label`.
 *
 * @publicDocs
 */
export const ShopPayButton = defineComponent(
  (props: ShopPayButtonProps) => {
    return () => {
      const attributes = getShopPayButtonElementAttributes(props);
      return canUseDom
        ? h(SHOP_PAY_BUTTON_TAG_NAME, attributes)
        : h(SHOP_PAY_BUTTON_TAG_NAME, {
            ...attributes,
            innerHTML: getShopPayButtonDeclarativeShadowDomHtml(props),
          });
    };
  },
  {
    name: "ShopPayButton",
    inheritAttrs: false,
    props: {
      variants: null,
      channel: null,
      checkoutUrl: String,
      paymentOption: null,
      source: String,
      sourceToken: String,
      nonce: String,
      disabled: Boolean,
      width: String,
      borderRadius: String,
      accessibilityLabel: String,
    } satisfies CompletePropOptions<ShopPayButtonProps>,
  },
);
