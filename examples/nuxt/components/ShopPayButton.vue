<script setup lang="ts">
import {
  getShopPayButtonAttributes,
  getShopPayButtonStyleProperties,
  loadShopJs,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "@shopify/hydrogen";
import { computed, onMounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    variants?: ShopPayButtonOptions["variants"];
    paymentOption?: ShopPayButtonOptions["paymentOption"];
    source?: string;
    sourceToken?: string;
    channel?: ShopPayButtonOptions["channel"];
    disabled?: boolean;
    width?: string;
    height?: string;
    borderRadius?: string;
    loadScript?: boolean;
  }>(),
  {
    disabled: false,
    loadScript: true,
  },
);

const storefrontUrl = ref<string>();

onMounted(() => {
  storefrontUrl.value = window.location.origin;
  if (!props.loadScript) return;
  loadShopJs().catch((error: unknown) => {
    console.error("[hydrogen:error:ShopPay] shop-js failed to load:", error);
  });
});

const attrs = computed(() =>
  getShopPayButtonAttributes({
    variants: props.variants,
    paymentOption: props.paymentOption,
    source: props.source,
    sourceToken: props.sourceToken,
    channel: props.channel,
    disabled: props.disabled,
    checkoutUrl: storefrontUrl.value,
  }),
);

const style = computed(() =>
  getShopPayButtonStyleProperties({
    width: props.width,
    height: props.height,
    borderRadius: props.borderRadius,
  }),
);
</script>

<template>
  <component :is="SHOP_PAY_BUTTON_TAG_NAME" v-bind="attrs" :style="style" />
</template>
