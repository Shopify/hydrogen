import { defineComponent, h, onMounted, shallowRef, type PropType } from "vue";

import {
  getShopPayButtonAttributes,
  getShopPayButtonStyleProperties,
  handleShopPayCheckoutClick,
  loadShopJs,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay";

export type ShopPayButtonProps = Omit<ShopPayButtonOptions, "checkoutUrl"> & {
  loadScript?: boolean;
};

export const ShopPayButton = defineComponent({
  name: "ShopPayButton",
  props: {
    variants: {
      type: Array as PropType<ShopPayButtonOptions["variants"]>,
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
    height: {
      type: String,
      default: undefined,
    },
    borderRadius: {
      type: String,
      default: undefined,
    },
    loadScript: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, { attrs }) {
    const storefrontUrl = shallowRef<string>();

    onMounted(() => {
      storefrontUrl.value = window.location.origin;
      if (!props.loadScript) return;
      loadShopJs().catch((error: unknown) => {
        console.error("[hydrogen:error:ShopPay] shop-js failed to load:", error);
      });
    });

    return () => {
      const style = getShopPayButtonStyleProperties(props);
      const effectiveProps = {
        ...props,
        checkoutUrl: storefrontUrl.value,
      };

      return h(SHOP_PAY_BUTTON_TAG_NAME, {
        ...attrs,
        ...getShopPayButtonAttributes(effectiveProps),
        ...(__DEV__
          ? {
              onClickCapture: (event: MouseEvent) => {
                handleShopPayCheckoutClick(event, effectiveProps);
              },
            }
          : {}),
        ...(Object.keys(style).length > 0 ? { style: [attrs.style, style] } : {}),
      });
    };
  },
});
