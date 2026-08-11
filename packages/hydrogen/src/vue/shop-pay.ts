import { defineComponent, h, type PropType } from "vue";

import {
  getShopPayButtonElementContentHtml,
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
  setup(props) {
    return () => {
      return h(SHOP_PAY_BUTTON_TAG_NAME, {
        innerHTML: getShopPayButtonElementContentHtml(props),
      });
    };
  },
});
