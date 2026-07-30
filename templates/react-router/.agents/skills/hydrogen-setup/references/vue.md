# Vue Setup

## Shopify Routes

When a framework binding exports `ShopifyScripts`, it loads WebMCP by default. When Shopify or Hydrogen browser utilities need to navigate through the framework router, pass a top-level navigation hook to `ShopifyScripts`.

```vue
<script setup lang="ts">
import { ShopifyScripts } from "@shopify/hydrogen/vue";

const router = useRouter();
</script>

<template>
  <ShopifyScripts :shop="shop" :navigate="(url) => router.push(url)"  />
  <main><!-- app layout --></main>
</template>
```
