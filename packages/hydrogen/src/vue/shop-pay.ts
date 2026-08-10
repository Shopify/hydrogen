import { defineComponent, h, type PropType } from "vue";

import {
  getShopPayButtonAnchorAttributes,
  getShopPayButtonContentHtml,
  getShopPayButtonStyleProperties,
  SHOP_PAY_BUTTON_STYLES,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

export type ShopPayButtonProps = ShopPayButtonOptions;

export const ShopPayButton = defineComponent({
  name: "ShopPayButton",
  inheritAttrs: false,
  props: {
    variants: {
      type: Array as PropType<ShopPayButtonOptions["variants"]>,
      default: undefined,
    },
    checkoutUrl: {
      type: String,
      default: undefined,
    },
    paymentOption: {
      type: String as PropType<ShopPayButtonOptions["paymentOption"]>,
      default: undefined,
    },
    source: {
      type: String,
      default: undefined,
    },
    sourceToken: {
      type: String,
      default: undefined,
    },
    channel: {
      type: String as PropType<ShopPayButtonOptions["channel"]>,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    width: {
      type: String,
      default: undefined,
    },
    borderRadius: {
      type: String,
      default: undefined,
    },
    locale: {
      type: String,
      default: undefined,
    },
    buttonText: {
      type: String,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    return () => {
      const {
        class: buttonClassName,
        href,
        "aria-disabled": ariaDisabled,
      } = getShopPayButtonAnchorAttributes(props);
      const { class: extraClassName, style: extraStyle, ...anchorAttrs } = attrs;

      return [
        h("a", {
          ...anchorAttrs,
          class: [buttonClassName, extraClassName],
          href,
          "aria-disabled": ariaDisabled,
          style: [getShopPayButtonStyleProperties(props), extraStyle],
          // Static, locale-keyed markup owned by this package; user-provided
          // buttonText is escaped by getShopPayButtonContentHtml.
          innerHTML: getShopPayButtonContentHtml(props),
        }),
        h("style", SHOP_PAY_BUTTON_STYLES),
      ];
    };
  },
});
