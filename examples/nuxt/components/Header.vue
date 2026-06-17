<script setup lang="ts">
import { HEADER_COLLECTIONS_QUERY, normalizeHeaderCollections } from "@shared/header";

import { useCart } from "~/storefront/cart";
import { CART_DRAWER_ID, openCartDrawer, supportsDialogCommands } from "~/storefront/cart-drawer";

const { $storefrontClient } = useNuxtApp();
const { data: headerCollections } = await useAsyncData("header-collections", async () => {
  const response = await $storefrontClient.graphql(HEADER_COLLECTIONS_QUERY);
  return normalizeHeaderCollections(response.data?.collections?.nodes);
});
const collections = computed(() => headerCollections.value ?? []);

const totalQuantity = useCart((s) => s.data.totalQuantity);
const route = useRoute();
const hasHydrated = ref(false);
const rendersCartPage = computed(() => route.name === "cart");
const cartLabel = computed(() =>
  totalQuantity.value === 0
    ? "Cart, empty"
    : `Cart, ${totalQuantity.value > 99 ? "99 or more" : totalQuantity.value} ${
        totalQuantity.value === 1 ? "item" : "items"
      }`,
);

onMounted(() => {
  hasHydrated.value = true;
});
</script>

<template>
  <header class="border-b border-black/10">
    <div class="mx-auto grid h-16 max-w-[1480px] grid-cols-3 items-center px-6">
      <nav class="flex items-center gap-6 text-sm font-semibold">
        <NuxtLink
          v-for="collection in collections"
          :key="collection.handle"
          :to="`/collections/${collection.handle}`"
          class="hover:opacity-60"
        >
          {{ collection.title }}
        </NuxtLink>
        <NuxtLink to="/collections" class="hover:opacity-60"> Collections </NuxtLink>
        <NuxtLink to="/blogs/news" class="hover:opacity-60">News</NuxtLink>
      </nav>
      <NuxtLink to="/" class="justify-self-center text-lg font-black tracking-tight">
        MOCK.SHOP
      </NuxtLink>
      <div class="flex items-center justify-end gap-5">
        <button
          type="button"
          aria-label="Search"
          class="grid h-10 w-10 place-items-center hover:opacity-60"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
        <NuxtLink
          to="/"
          aria-label="Account"
          class="grid h-10 w-10 place-items-center hover:opacity-60"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        </NuxtLink>
        <NuxtLink
          v-if="!hasHydrated || rendersCartPage"
          to="/cart"
          :aria-label="cartLabel"
          :aria-current="rendersCartPage ? 'page' : undefined"
          class="relative grid h-10 w-10 place-items-center hover:opacity-60"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M5 7h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
            <path d="M9 7V5a3 3 0 0 1 6 0v2" />
          </svg>
          <span
            v-if="totalQuantity > 0"
            class="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[11px] font-bold text-white"
          >
            {{ totalQuantity > 99 ? "99+" : totalQuantity }}
          </span>
        </NuxtLink>
        <button
          v-else
          type="button"
          :aria-label="cartLabel"
          :aria-controls="CART_DRAWER_ID"
          aria-haspopup="dialog"
          command="show-modal"
          :commandfor="CART_DRAWER_ID"
          class="relative grid h-10 w-10 place-items-center hover:opacity-60"
          @click="!supportsDialogCommands() && openCartDrawer()"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M5 7h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
            <path d="M9 7V5a3 3 0 0 1 6 0v2" />
          </svg>
          <span
            v-if="totalQuantity > 0"
            class="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[11px] font-bold text-white"
          >
            {{ totalQuantity > 99 ? "99+" : totalQuantity }}
          </span>
        </button>
      </div>
    </div>
  </header>
</template>
