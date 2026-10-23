# Vue

Pass the data to `ShopifyScripts` once, in the root layout. Render `AccountWidget` wherever the widget should appear:

```vue
<script setup lang="ts">
import type { ShopifyAccountWidgetData, ShopifyScriptsShop } from "@shopify/hydrogen";
import { AccountWidget, ShopifyScripts } from "@shopify/hydrogen/vue";

defineProps<{ accountWidget: ShopifyAccountWidgetData; shop: ShopifyScriptsShop }>();
</script>

<template>
  <ShopifyScripts :shop="shop" :account-widget="accountWidget" />
  <header>
    <AccountWidget>
      <template #fallback>
        <img src="/icons/user.svg" alt="Sign in" />
      </template>
    </AccountWidget>
  </header>
</template>
```

- Build `accountWidget` on the server, with `customer: null` for signed-out visitors.
- When `accountWidget` changes, `ShopifyScripts` updates the JSON script tag and every `AccountWidget` remounts after the DOM update. Changes are compared by value.
- The `fallback` slot replaces the signed-out avatar. `AccountWidget` puts it in the component's `signed-out-avatar` slot for you.
- Templates that render `<shopify-account>` directly need `compilerOptions.isCustomElement` for `shopify-` tags. `AccountWidget` doesn't.
