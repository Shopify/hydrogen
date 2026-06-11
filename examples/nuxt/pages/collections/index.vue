<script setup lang="ts">
import { gql } from "@shopify/hydrogen";

const COLLECTIONS_QUERY = gql(`
  query Collections {
    collections(first: 12) {
      nodes {
        handle
        title
        image {
          url
          altText
        }
      }
    }
  }
`);

const { $storefrontClient } = useNuxtApp();

const { data } = await useAsyncData("collections", async () => {
  const response = await $storefrontClient.graphql(COLLECTIONS_QUERY);
  return response.data;
});
const collections = computed(() => data.value?.collections?.nodes ?? []);

useHead({ title: "Collections — Mock.shop" });
</script>

<template>
  <main class="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
    <header>
      <h1 class="text-6xl font-black tracking-tight md:text-8xl">Collections</h1>
    </header>

    <section class="mt-16 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="collection in collections"
        :key="collection.handle"
        :to="`/collections/${collection.handle}`"
        class="group block"
      >
        <div class="aspect-square overflow-hidden bg-neutral-100">
          <img
            v-if="collection.image"
            :src="collection.image.url"
            :alt="collection.image.altText ?? collection.title"
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div class="mt-5">
          <h3 class="text-base font-semibold">{{ collection.title }}</h3>
        </div>
      </NuxtLink>
    </section>
  </main>
</template>
