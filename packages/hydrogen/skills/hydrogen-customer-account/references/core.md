# Core Helpers

Use core helpers when not using the React or Vue bindings:

```ts
import {
  renderShopifyAccountWidget,
  renderShopifyScriptTags,
} from "@shopify/hydrogen";
```

Enable `account` in the head script tags the app already renders once, and keep
`initializeShopifyScripts()` during browser hydration as the `hydrogen-routing`
skill describes:

```ts
const headTags = renderShopifyScriptTags({ shop, account: true });
```

`renderShopifyAccountWidget(options)` returns an HTML string containing
`<shopify-store>`, `<shopify-account>`, the shared layout `<style>`, and the
avatar inside Hydrogen's `signed-out-avatar` slot wrapper. Use it in server
templates or frameworks with raw-HTML rendering (`{@html}`, `v-html`,
`innerHTML`):

```ts
const html = renderShopifyAccountWidget({
  storeDomain,
  publicAccessToken,
  customerAccessToken,
  signedOutAvatarHtml: '<img src="/icons/user.svg" alt="">',
});
```

The string is static output with no event forwarding: render it again whenever
the session changes, and attach `open` / `close` listeners to the
`<shopify-account>` element directly if the app needs them.

## Validation Rules

- `signedOutAvatarHtml` is required and Hydrogen does **not** escape it: pass only application-owned markup, never user-controlled HTML. Keep it visual only and without a `slot` attribute.
- `publicAccessToken` must be a public Storefront API token; it is serialized into HTML.
- `customerAccessToken` is the current access token from `getAccessToken()` on the server, or omitted / `null` when signed out. Follow the skill's Account Widget rules for response privacy.
- `signInUrl` defaults to `/account/login`.
- `nonce` is optional. It is applied to the emitted `<style>` element for strict Content Security Policies.
