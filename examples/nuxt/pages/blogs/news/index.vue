<script setup lang="ts">
import { gql } from "@shopify/hydrogen";

const NEWS_QUERY = gql(`
  query News {
    blog(handle: "news") {
      articles(first: 10) {
        nodes {
          handle
          title
          publishedAt
          excerpt
        }
      }
    }
  }
`);

type Article = {
  handle: string;
  title: string;
  publishedAt: string;
  excerpt: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });
const { $storefrontClient } = useNuxtApp();

const { data } = await useAsyncData("news", async () => {
  const response = await $storefrontClient.graphql(NEWS_QUERY);
  return response.data as { blog: { articles: { nodes: Article[] } } | null } | null;
});

if (!data.value?.blog) {
  throw createError({ statusCode: 404, statusMessage: "Blog not found" });
}

const featured = computed(() => data.value?.blog?.articles.nodes[0]);
const rest = computed(() => data.value?.blog?.articles.nodes.slice(1) ?? []);

useHead({ title: "News — Mock.shop" });
</script>

<template>
  <main class="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
    <header>
      <h1 class="text-6xl font-black tracking-tight md:text-8xl">News</h1>
    </header>

    <section class="mt-16 space-y-6">
      <NuxtLink
        v-if="featured"
        :to="`/blogs/news/${featured.handle}`"
        class="group block border border-black/15 p-8 transition-colors hover:border-black md:p-10"
      >
        <h2 class="text-2xl font-bold tracking-tight md:text-3xl">
          {{ featured.title }}
        </h2>
        <p class="mt-2 text-sm text-black/60">
          {{ dateFormatter.format(new Date(featured.publishedAt)) }}
        </p>
        <p class="mt-6 text-base leading-relaxed text-black/80">
          {{ featured.excerpt }}
        </p>
        <p class="mt-8 text-sm font-medium text-black/70 group-hover:text-black">Read more...</p>
      </NuxtLink>

      <div v-if="rest.length > 0" class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <NuxtLink
          v-for="article in rest"
          :key="article.handle"
          :to="`/blogs/news/${article.handle}`"
          class="group block border border-black/15 p-8 transition-colors hover:border-black"
        >
          <h2 class="text-xl font-bold tracking-tight md:text-2xl">
            {{ article.title }}
          </h2>
          <p class="mt-2 text-sm text-black/60">
            {{ dateFormatter.format(new Date(article.publishedAt)) }}
          </p>
          <p class="mt-6 text-base leading-relaxed text-black/80">
            {{ article.excerpt }}
          </p>
          <p class="mt-8 text-sm font-medium text-black/70 group-hover:text-black">Read more...</p>
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
