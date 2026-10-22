---
"@shopify/hydrogen": minor
---

**Breaking:** `ShopifyScripts` and `getShopifyScriptTags()` replace the `account` boolean with an `accountWidget` option. Pass the widget's data instead of `true`, and Hydrogen renders it in the same JSON script tag that Liquid themes use, so the customer access token stays on the server:

```diff
- <ShopifyScripts shop={shop} account />
+ <ShopifyScripts
+   shop={shop}
+   accountWidget={{ customer: customer ?? null, shop: accountSettings }}
+ />
```

Pass `accountWidget` whenever you want the widget, with `customer: null` for signed-out visitors. It takes only the fields the widget reads, and every one is required, because `<shopify-account>` skips its own data requests when the JSON is present. Hydrogen adds the shop ID and locale from the `shop` and `i18n` options, escapes the JSON, and throws on unknown fields so values such as access tokens can't reach the HTML.

Render the new React and Vue `ShopifyAccount` component where the widget should appear. It remounts `<shopify-account>` whenever the `accountWidget` data changes, because the web component reads the data only when it connects. Its `signInUrl` defaults to Hydrogen's `/account/login` route. The new `hydrogen-account-widget` skill covers setup, including framework-agnostic remounting.
