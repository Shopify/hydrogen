---
"@shopify/hydrogen": minor
---

**Breaking:** `ShopifyScripts` and `getShopifyScriptTags()` replace the `account` boolean with an `accountWidget` option. Pass the widget's data instead of `true`, and Hydrogen renders it in the same JSON script tag that Liquid themes use, so the customer access token stays on the server:

```diff
- <ShopifyScripts shop={shop} account />
+ <ShopifyScripts
+   shop={shop}
+   accountWidget={{ customer: customer ?? null, shop: { socialLoginProviders: ["shop"] } }}
+ />
```

Pass `accountWidget` whenever you want the widget, with `customer: null` for signed-out visitors. It takes only what the widget needs: the customer's name, email, and avatar, and the shop's sign-in providers, with optional typed translations. Hydrogen adds the shop ID and locale from the `shop` and `i18n` options, keeps legacy customer accounts and the email marketing opt-in off, escapes the JSON, and throws on unknown or missing fields so values such as access tokens can't reach the HTML.

Render the new React and Vue `AccountWidget` component where the widget should appear. It remounts `<shopify-account>` whenever the `accountWidget` data changes, because the web component reads the data only when it connects, and signs in through Hydrogen's `/account/login` route. Pass `fallback` to replace the signed-out avatar. The new `hydrogen-account-widget` skill covers setup, including framework-agnostic remounting.
