<script setup lang="ts">
import { buildProductSelectionSearchParams } from "@shopify/hydrogen";

import type { ProductData } from "~/storefront/product";
import { useProductForm } from "~/storefront/product";

const props = defineProps<{ product: ProductData }>();
const route = useRoute();

type ProductOptionValueSwatch = ProductData["options"][number]["optionValues"][number]["swatch"];

const form = useProductForm();

function isColor(name: string): boolean {
  return name.toLowerCase() === "color";
}

function getSwatchStyle(swatch: ProductOptionValueSwatch | null | undefined) {
  const image = swatch?.image?.previewImage?.url;

  return {
    backgroundColor: swatch?.color ?? "#999",
    backgroundImage: image ? `url(${image})` : undefined,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
}

function variantRoute(selectedOptions: { name: string; value: string }[], handle?: string) {
  const targetHandle = handle ?? props.product.handle;
  return { path: `/products/${targetHandle}`, query: variantQuery(selectedOptions) };
}

function variantQuery(selectedOptions: { name: string; value: string }[]) {
  const params = buildProductSelectionSearchParams({
    selectedOptions,
    optionNames: props.product.options.map((option) => option.name),
    base: queryToSearchParams(route.query),
  });
  return searchParamsToQuery(params);
}

function queryToSearchParams(query: typeof route.query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item !== null && item !== undefined) params.append(key, item);
    }
  }
  return params;
}

function searchParamsToQuery(params: URLSearchParams) {
  const query: Record<string, string | string[]> = {};
  for (const [key, value] of params) {
    const current = query[key];
    if (current === undefined) {
      query[key] = value;
    } else if (Array.isArray(current)) {
      current.push(value);
    } else {
      query[key] = [current, value];
    }
  }
  return query;
}
</script>

<template>
  <div class="space-y-8">
    <div v-for="option in form.options" :key="option.name">
      <p class="text-sm font-semibold">
        {{ option.name }}
        <span v-if="option.values.find((v) => v.selected)" class="font-normal text-black/60">
          {{ option.values.find((v) => v.selected)?.name }}
        </span>
      </p>
      <div
        :class="isColor(option.name) ? 'mt-3 flex items-center gap-3' : 'mt-3 flex flex-wrap gap-2'"
      >
        <template v-for="value in option.values" :key="value.name">
          <NuxtLink
            v-if="value.handle !== product.handle"
            :to="variantRoute(value.selectedOptions, value.handle)"
            replace
            :aria-label="isColor(option.name) ? value.name : undefined"
            :class="
              isColor(option.name)
                ? 'block h-7 w-7 rounded-full'
                : 'flex h-11 min-w-20 items-center justify-center rounded-full border border-black/15 px-5 text-sm font-semibold hover:border-black'
            "
            :style="isColor(option.name) ? getSwatchStyle(value.swatch) : undefined"
          >
            <template v-if="!isColor(option.name)">{{ value.name }}</template>
          </NuxtLink>

          <button
            v-else
            type="button"
            :aria-pressed="value.selected"
            :disabled="!value.exists"
            v-bind="
              form.register('optionValue', {
                optionName: option.name,
                value: value.name,
              })
            "
            :aria-label="isColor(option.name) ? value.name : undefined"
            :class="
              isColor(option.name)
                ? value.selected
                  ? 'h-7 w-7 rounded-full ring-2 ring-black ring-offset-2 disabled:opacity-30'
                  : 'h-7 w-7 rounded-full disabled:opacity-30'
                : value.selected
                  ? 'h-11 min-w-20 rounded-full bg-black px-5 text-sm font-semibold text-white disabled:opacity-30'
                  : 'h-11 min-w-20 rounded-full border border-black/15 px-5 text-sm font-semibold hover:border-black disabled:opacity-30'
            "
            :style="isColor(option.name) ? getSwatchStyle(value.swatch) : undefined"
          >
            <template v-if="!isColor(option.name)">
              {{ value.name }}
              <template v-if="value.exists && !value.available"> - Sold out</template>
            </template>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
