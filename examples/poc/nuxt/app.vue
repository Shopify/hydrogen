<script setup lang="ts">
import { initializeShopifyScripts } from "@shopify/hydrogen";
import { onMounted } from "vue";

import { provideCartStore } from "~/storefront/cart";
import { routeTemplates } from "~/utils/route-templates";

provideCartStore();
const route = useRoute();
const router = useRouter();

onMounted(() => {
  void initializeShopifyScripts({
    navigate: async (url) => {
      await router.push(url);
    },
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
</template>
