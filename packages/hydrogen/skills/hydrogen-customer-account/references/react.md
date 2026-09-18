# React

Import from the React entrypoint:

```tsx
import { ShopifyAccountWidget } from "@shopify/hydrogen/react";
```

Enable `account` on the `ShopifyScripts` the root layout already renders once in
the document head:

```tsx
<ShopifyScripts account shop={shop} routes={routeTemplates} />
```

In the header:

```tsx
<ShopifyAccountWidget
  storeDomain={storeDomain}
  publicAccessToken={publicAccessToken}
  customerAccessToken={customerAccessToken}
  signedOutAvatar={<img src="/icons/user.svg" alt="" />}
/>
```

`ShopifyAccountWidget` server-renders the `<shopify-store>` and
`<shopify-account>` markup with the signed-out avatar and its reserved footprint,
so the header is stable before Shopify's bundle loads. It supports React 18 and
19 and remounts the widget when `customerAccessToken` is added, changed, or
removed; resolve that token on the server per the skill's Account Widget rules.

`signedOutAvatar` is a required `ReactElement` prop — the component takes no
`children`. Hydrogen wraps it in the `signed-out-avatar` slot, so do not add a
`slot` attribute, and keep it visual only because Shopify projects it inside its
own button. Optional `onOpen` / `onClose` receive the original non-bubbling
`CustomEvent<null>`; the binding handles the native listeners and their cleanup.
Pass `nonce` when the storefront's Content Security Policy requires nonces for
inline `<style>` elements.
