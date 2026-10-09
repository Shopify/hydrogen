<script setup lang="ts">
import { createNuxtWebRequest } from "@shared/nuxt-event";
import { handleShopifyRedirects } from "@shopify/hydrogen";

import type { NuxtError } from "#app";

import { routeTemplates } from "./utils/route-templates";

const props = defineProps<{ error: NuxtError }>();

if (import.meta.server && props.error.statusCode === 404) {
  const event = useRequestEvent();
  if (event) {
    const request = createNuxtWebRequest(event);
    const { storefrontClient } = event.context;
    const redirect = await handleShopifyRedirects({
      request,
      routeTemplates,
      storefrontClient,
    });
    if (redirect) {
      const location = redirect.headers.get("location");
      if (location) {
        await navigateTo(location, { redirectCode: redirect.status as 301 | 302 });
      }
    }
  }
}
</script>

<template>
  <main class="mx-auto max-w-3xl px-6 py-16 text-center md:py-24">
    <h1 class="text-6xl font-black tracking-tight">
      {{ error.statusCode }}
    </h1>
    <p class="mt-4 text-lg text-black/60">
      {{ error.statusMessage || "The requested page could not be found." }}
    </p>
    <NuxtLink
      to="/"
      class="mt-8 inline-block rounded-full bg-black px-8 py-3 text-sm font-semibold text-white hover:opacity-90"
    >
      Return home
    </NuxtLink>
  </main>
</template>
