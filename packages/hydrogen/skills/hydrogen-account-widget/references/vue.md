# Vue

Pass the data to `ShopifyScripts` once, in the root layout. Render `ShopifyAccount` wherever the widget should appear:

```vue
<script setup lang="ts">
import { CUSTOMER_ACCOUNT_LOGIN_PATH } from "@shopify/hydrogen/customer-account";
import type { ShopifyAccountWidgetData, ShopifyScriptsShop } from "@shopify/hydrogen";
import { ShopifyAccount, ShopifyScripts } from "@shopify/hydrogen/vue";

defineProps<{ accountWidget: ShopifyAccountWidgetData; shop: ShopifyScriptsShop }>();
</script>

<template>
  <ShopifyScripts :shop="shop" :account-widget="accountWidget" />
  <header>
    <ShopifyAccount :sign-in-url="CUSTOMER_ACCOUNT_LOGIN_PATH">
      <img slot="signed-out-avatar" src="/icons/user.svg" alt="Sign in" />
    </ShopifyAccount>
  </header>
</template>
```

- Build `accountWidget` on the server, with `customer: null` for signed-out visitors.
- When `accountWidget` changes, `ShopifyScripts` updates the JSON script tag and every `ShopifyAccount` remounts after the DOM update. Changes are compared by value.
- Templates that render `<shopify-account>` directly need `compilerOptions.isCustomElement` for `shopify-` tags. `ShopifyAccount` doesn't.
