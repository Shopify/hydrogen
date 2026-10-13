<script setup lang="ts">
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

const route = useRoute();
const handle = computed(() => route.params.handle as string);
const articleApiPath = computed(
  () => `/api/blogs/news/${encodeURIComponent(handle.value)}` as const,
);

const { data } = await useFetch(() => articleApiPath.value, {
  key: computed(() => `article-${handle.value}`),
  watch: [handle],
});

const article = computed(() => data.value?.blog?.articleByHandle);

if (!article.value) {
  throw createError({ statusCode: 404, statusMessage: "Article not found" });
}

useHead({ title: () => `${article.value?.title ?? "Article"} — Mock.shop` });
</script>

<template>
  <main
    id="main-content"
    v-if="article"
    tabindex="-1"
    class="mx-auto max-w-3xl px-6 py-16 md:py-24"
  >
    <article>
      <header class="text-center">
        <h1 class="text-5xl font-black tracking-tight md:text-7xl">
          {{ article.title }}
        </h1>
        <p class="mt-6 text-sm text-black/60">
          {{ dateFormatter.format(new Date(article.publishedAt)) }}
        </p>
      </header>

      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        class="mt-16 text-base leading-relaxed text-black/80 *:first:mt-0 md:text-lg [&>h3]:mt-12 [&>h3]:text-3xl [&>h3]:font-black [&>h3]:tracking-tight [&>h3]:text-black md:[&>h3]:text-4xl [&>p]:mt-6"
        v-html="article.contentHtml"
      />

      <div class="mt-20 border-t border-black/10 pt-8">
        <NuxtLink
          to="/blogs/news"
          class="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-60"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back to News
        </NuxtLink>
      </div>
    </article>
  </main>
</template>
