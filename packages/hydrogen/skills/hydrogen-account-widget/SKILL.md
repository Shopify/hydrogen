---
name: hydrogen-account-widget
description: >
  Guide for adding Shopify's account widget (`<shopify-account>`) to a Hydrogen
  storefront. Use when wiring the `accountWidget` option of ShopifyScripts or
  getShopifyScriptTags, rendering ShopifyAccount, showing a sign-in avatar or
  account sheet in the header, or updating the widget after sign-in or sign-out.
---

# Account Widget

Shopify's `<shopify-account>` web component shows an avatar. Clicking it opens an account sheet with sign-in options for signed-out visitors and menu links for signed-in customers.

Hydrogen renders the widget's data the same way Liquid themes do: as one JSON script tag, `<script type="application/json" id="shopify-customer-account-data">`, that the component reads. The customer access token stays on the server. The JSON carries only display data.

## Framework References

Before writing UI, check whether this skill has a reference file for the app's framework in `references/`. If one exists, read it and use that framework binding. Otherwise use `references/core.md`.

## The Data Contract

Pass `accountWidget` whenever the page should show the widget:

```ts
const accountWidget: ShopifyAccountWidgetData = {
  customer: signedInCustomer ?? null, // null = signed out
  shop: { id, legacyCustomerAccounts, b2bEnabled, marketingConsentSigninEnabled,
          marketingConsentPreselected, socialLoginProviders, customerAccountTranslations },
  visitor: { sessionId, country, language },
};
```

- Option present = show the widget. `customer` present = signed in. Leave `accountWidget` out to omit the widget's data and script.
- Every field is required. When the JSON is on the page, the component skips its own Storefront API requests, so a missing field silently turns off a feature such as social sign-in or the marketing opt-in.
- `shop` and `visitor` are required for signed-out visitors too. Without the JSON, the component falls back to fetching through a `<shopify-store>` element; with no store on the page it renders a bare signed-out button with no social sign-in, translations, or shop settings.
- The app owns where `shop` and `visitor` values come from, and the caching of pages that carry customer data. Pages with a signed-in `customer` contain personal data: serve them with private caching.
- Load customer fields on the server with the Customer Account API. Pass only the fields the type lists. Hydrogen copies only known fields and escapes the JSON, but the token belongs in server code only.

## Rules

- Render exactly one JSON script tag per page: pass `accountWidget` to a single `ShopifyScripts` (or `getShopifyScriptTags`) call. Render the widget elements anywhere, as many times as the layout needs (for example in the desktop header and the mobile menu).
- `<shopify-account>` reads the JSON once, when the element connects. After the data changes (sign-in, sign-out, profile update, client-side navigation with new loader data), remount every `<shopify-account>`. The React and Vue `ShopifyAccount` components do this automatically; framework-agnostic code must do it by hand.
- `ShopifyAccount` signs in through Hydrogen's `/account/login` route from `createCustomerAccountServerHandlers`, which forwards the `login_hint`, `login_hint_mode`, and `acr_values` query parameters the component adds. A custom `signInUrl` route must pass them to `customerSession.prepareLoginUrl()` itself.
- `menu` loads through a `<shopify-store>` element. Without one, the component shows the default Orders and Profile links, so leave `menu` out unless the page renders a store.
- Customize the signed-out avatar with a `slot="signed-out-avatar"` child, and style the sheet with the `--shopify-account-*` CSS variables. See https://shopify.dev/docs/api/storefront-web-components/components/shopify-account.
