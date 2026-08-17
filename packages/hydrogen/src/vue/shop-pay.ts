import { defineComponent, h } from "vue";

import {
  getShopPayButtonDeclarativeShadowDomHtml,
  getShopPayButtonElementAttributes,
  initializeShopPayButtonElement,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

export type ShopPayButtonProps = ShopPayButtonOptions;

const canUseDom = typeof document !== "undefined";

export const ShopPayButton = defineComponent(
  (props: ShopPayButtonProps) => {
    return () => {
      const attributes = getShopPayButtonElementAttributes(props);
      return canUseDom
        ? h(SHOP_PAY_BUTTON_TAG_NAME, {
            ...attributes,
            ref: (element: unknown) => {
              if (element instanceof HTMLElement) initializeShopPayButtonElement(element, props);
            },
          })
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
    },
  },
);
