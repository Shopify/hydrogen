<script setup lang="ts">
import { provideProductForm, type ProductVariantData } from "~/storefront/product";
import { toFetchQuery } from "~/utils/fetch-query";

const route = useRoute();
const router = useRouter();
const handle = computed(() => route.params.handle as string);
const selectedOptionsKey = computed(() =>
  new URLSearchParams(route.query as Record<string, string>).toString(),
);
const productApiPath = computed(() => `/api/products/${encodeURIComponent(handle.value)}` as const);

const { data } = await useFetch(() => productApiPath.value, {
  key: computed(() => `product-${handle.value}`),
  query: computed(() => toFetchQuery(selectedOptionsKey.value)),
  watch: [handle, selectedOptionsKey],
});

if (!data.value?.product) {
  throw createError({ statusCode: 404, statusMessage: "Product not found" });
}

const product = computed(() => {
  const value = data.value?.product;
  if (!value) {
    throw createError({ statusCode: 404, statusMessage: "Product not found" });
  }

  return value;
});
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

provideProductForm(product, { onSelect: handleSelect });
</script>

<template>
  <main id="main-content" tabindex="-1">
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
</template>
