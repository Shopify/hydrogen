import { defineComponent, h } from "vue";

import {
  defineShopPayButton,
  getShopPayButtonDeclarativeShadowDomHtml,
  getShopPayButtonElementAttributes,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

/**
 * Props accepted by the Vue `ShopPayButton` component.
 *
 * @public
 */
export type ShopPayButtonProps = ShopPayButtonOptions;

type CompletePropOptions<T> = {
  [K in keyof T]-?: unknown;
};

const canUseDom = typeof document !== "undefined";
defineShopPayButton();

/**
 * Vue component that renders the Shop Pay button custom element. On the server it includes
 * declarative shadow DOM markup so the button renders before scripts load.
 *
 * @public
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
