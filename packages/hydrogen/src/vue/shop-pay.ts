import { defineComponent, h, type PropType } from "vue";

import {
  getShopPayButtonAnchorAttributes,
  getShopPayButtonContentHtml,
  getShopPayButtonStyleProperties,
  SHOP_PAY_BUTTON_STYLES,
  SHOP_PAY_BUTTON_TAG_NAME,
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
    accessibilityLabel: {
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
        "aria-label": ariaLabel,
      } = getShopPayButtonAnchorAttributes(props);
      const { class: extraClassName, style: extraStyle, ...anchorAttrs } = attrs;

      return h(SHOP_PAY_BUTTON_TAG_NAME, [
        // innerHTML instead of a text child: Vue SSR entity-escapes style text,
        // which browsers do not decode inside <style>.
        h("style", { innerHTML: SHOP_PAY_BUTTON_STYLES }),
        h("a", {
          ...anchorAttrs,
          class: [buttonClassName, extraClassName],
          href,
          "aria-disabled": ariaDisabled,
          "aria-label": ariaLabel,
          style: [getShopPayButtonStyleProperties(props), extraStyle],
          // Static markup owned by this package; user-provided text is escaped
          // by getShopPayButtonContentHtml.
          innerHTML: getShopPayButtonContentHtml(props),
        }),
      ]);
    };
  },
});
