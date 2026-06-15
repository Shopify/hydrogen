<script setup lang="ts">
import { getSelectedProductOptions } from "@shopify/hydrogen";
import { gql } from "@shopify/hydrogen";

import type { ProductCardData } from "~/components/ProductCard.vue";
import { ProductProvider, type ProductData, type ProductVariantData } from "~/storefront/product";
import { productHandlers } from "~/storefront/product-handlers";

const RELATED_PRODUCTS_QUERY = gql(`
  query NuxtRelatedProducts($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 4) {
      nodes {
        handle
        title
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`);

type QueryResult = {
  product: ProductData | null;
  products: { nodes: ProductCardData[] };
};

const route = useRoute();
const router = useRouter();
const handle = computed(() => route.params.handle as string);
const { $storefrontClient } = useNuxtApp();

const selectedOptions = computed(() =>
  getSelectedProductOptions(new URLSearchParams(route.query as Record<string, string>)),
);

const { data } = await useAsyncData(
  computed(() => `product-${handle.value}`),
  async () => {
    const [productResult, relatedResult] = await Promise.all([
      productHandlers.get({
        storefrontClient: $storefrontClient,
        handle: handle.value,
        selectedOptions: selectedOptions.value,
      }),
      $storefrontClient.graphql(RELATED_PRODUCTS_QUERY),
    ]);

    return {
      product: productResult.data.product,
      products: relatedResult.data?.products ?? { nodes: [] },
    } satisfies QueryResult;
  },
  { watch: [handle, selectedOptions] },
);

if (!data.value?.product) {
  throw createError({ statusCode: 404, statusMessage: "Product not found" });
}

const product = computed(() => data.value?.product as NonNullable<QueryResult["product"]>);
const related = computed(
  () => data.value?.products.nodes.filter((p) => p.handle !== handle.value).slice(0, 4) ?? [],
);

useHead({ title: () => `${product.value.title} — Mock.shop` });

function handleSelect(result: {
  status: string;
  selectedOptions: { name: string; value: string }[];
  selectedVariant: ProductVariantData | null;
}) {
  const targetHandle = result.selectedVariant?.product?.handle ?? product.value.handle;
  router.replace({
    path: `/products/${targetHandle}`,
    query: variantQuery(result.selectedOptions),
  });
}

function variantQuery(nextSelectedOptions: { name: string; value: string }[]) {
  const query = { ...route.query };
  for (const option of product.value.options) delete query[option.name];
  for (const option of nextSelectedOptions) query[option.name] = option.value;
  return query;
}
</script>

<template>
  <ProductProvider :product="product" :on-select="handleSelect">
    <main>
      <section
        class="grid grid-cols-1 gap-12 px-6 py-10 md:grid-cols-[minmax(0,1fr)_420px] md:gap-16 md:px-10 md:py-12"
      >
        <div class="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-2">
          <div
            v-for="(image, i) in product.images.nodes"
            :key="image.url"
            class="aspect-square overflow-hidden bg-neutral-100"
          >
            <img
              :src="image.url"
              :alt="image.altText ?? `${product.title} — image ${i + 1}`"
              class="h-full w-full object-cover"
            />
          </div>
        </div>

        <ProductPurchasePanel :product="product" />
      </section>

      <section class="border-t border-black/10 px-6 py-16 md:px-10 md:py-20">
        <h2 class="text-2xl font-black tracking-tight">You may also like</h2>
        <div class="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
          <ProductCard v-for="p in related" :key="p.handle" :product="p" />
        </div>
      </section>
    </main>
  </ProductProvider>
</template>
