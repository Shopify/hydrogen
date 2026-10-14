<script setup lang="ts">
import { analyticsConsent, defaultI18n, shop } from "@shared/config";
import { getShopifyScriptTags, initializeShopifyScripts } from "@shopify/hydrogen";

import { CartProvider } from "~/storefront/cart";
import { routeTemplates } from "~/utils/route-templates";

const route = useRoute();
const router = useRouter();
const runtimeConfig = useRuntimeConfig();
const storefrontConfig = useState("storefront-config", () => {
  const requestConfig = useRequestEvent()?.context.storefrontConfig;
  if (requestConfig) return requestConfig;

  return {
    mode: runtimeConfig.public.storefrontMode === "private" ? "private" : "mock",
    storeDomain: runtimeConfig.public.storeDomain,
  } as const;
});
const isMockStorefront = storefrontConfig.value.mode === "mock";
const shopifyScriptTags = getShopifyScriptTags({
  analytics: isMockStorefront ? { channel: "headless" } : undefined,
  consent: isMockStorefront ? undefined : analyticsConsent,
  i18n: defaultI18n,
  shop: isMockStorefront
    ? {
        shopId: "0",
        storefrontId: "",
        myshopifyDomain: storefrontConfig.value.storeDomain,
      }
    : shop,
  shopifyAnalytics: !isMockStorefront,
});

const navigate = async (url: string) => {
  await router.push(url);
};

useHead({
  link: shopifyScriptTags.links.map(({ attributes }) => attributes),
  script: shopifyScriptTags.scripts.map(({ attributes, innerHTML }) => ({
    ...attributes,
    ...(innerHTML ? { innerHTML } : {}),
  })),
});

onMounted(() => {
  void initializeShopifyScripts({
    navigate,
    routes: routeTemplates,
  });

  watch(
    () => route.fullPath,
    async () => {
      await nextTick();
      document.getElementById("main-content")?.focus({ preventScroll: true });
    },
  );
});
</script>

<template>
  <CartProvider>
    <div class="bg-white text-black">
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to main content
      </a>
      <Header />
      <NuxtPage />
      <Footer />
      <CartDrawer />
    </div>
  </CartProvider>
</template>
