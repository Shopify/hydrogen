# Vue And Nuxt

Import from the Vue entrypoint:

```vue
<script setup lang="ts">
import { ShopifyAccountWidget } from "@shopify/hydrogen/vue";
</script>
```

Enable `account` on the `ShopifyScripts` the root layout already renders once in
the document head:

```vue
<ShopifyScripts account :shop="shop" :routes="routeTemplates" />
```

In the header:

```vue
<ShopifyAccountWidget
  :store-domain="storeDomain"
  :public-access-token="publicAccessToken"
  :customer-access-token="customerAccessToken"
>
  <template #signed-out-avatar>
    <img src="/icons/user.svg" alt="" />
  </template>
</ShopifyAccountWidget>
```

The component server-renders the `<shopify-store>` and `<shopify-account>`
markup with the signed-out avatar and its reserved footprint, so it works with
Nuxt server rendering and needs no client-only wrapper. It remounts the widget
when `customerAccessToken` is added, changed, or removed; resolve that token on
the server per the skill's Account Widget rules.

The named `signed-out-avatar` slot is required — the component has no default
slot and throws without it. Hydrogen wraps the slot content in the
`signed-out-avatar` slot element, so do not add a `slot` attribute, and keep it
visual only because Shopify projects it inside its own button. Optional `@open` /
`@close` receive the original non-bubbling `CustomEvent<null>`; the binding
handles the native listeners and their cleanup. Pass `nonce` when the
storefront's Content Security Policy requires nonces for inline `<style>`
elements.
