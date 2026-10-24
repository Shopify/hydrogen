---
name: hydrogen-account-widget
description: >
  Guide for adding Shopify's account widget (`<shopify-account>`) to a Hydrogen
  storefront. Use when wiring the `accountWidget` option of ShopifyScripts or
  getShopifyScriptTags, rendering AccountWidget, showing a sign-in avatar or
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
  // null = signed out
  customer: signedIn ? { firstName, lastName, email, avatarUrl } : null,
  shop: {
    socialLoginProviders: ["shop"], // "shop" | "apple" | "google" | "facebook"
    translations: { "signed_in_state.greeting_with_name": "Bonjour, {{first_name}}" }, // optional
  },
};
```

- Option present = show the widget. `customer` present = signed in. Leave `accountWidget` out to omit the widget's data and script.
- `customer` fields and `shop.socialLoginProviders` are required. When the JSON is on the page, the component skips its own Storefront API requests, so a missing field would silently turn off a feature.
- `socialLoginProviders`: offer only providers enabled for the shop; a provider that isn't enabled renders a sign-in button that fails. Read them from the Storefront API (see below). Hydrogen writes the casing the widget compares.
- `translations` is optional. Missing keys use the widget's English defaults. Keys are typed by `ShopifyAccountWidgetTranslationKey`.
- `customer.socialLoginProvider` is optional. Pass `"shop"` for customers who signed in with Shop to show the Shop-branded avatar. Other providers don't change how the widget looks.
- `shop.b2bEnabled` is optional and only shows Shop sign-in as a button instead of a card.
- Hydrogen adds the shop ID from the `shop` option and the country and language from the `i18n` option. It keeps legacy customer accounts and the email marketing opt-in off.
- Build each object from exactly the listed fields. A missing required field or any other field throws, because the data is rendered into the HTML: map Customer Account API results field by field instead of spreading them (a spread brings `__typename` and other fields along), and keep access tokens in server code. The Customer Account API names two fields differently: `avatarUrl` is `imageUrl`, and `email` is `emailAddress.emailAddress`.
- `shop` is required for signed-out visitors too. Without the JSON, the component falls back to fetching through a `<shopify-store>` element; with no store on the page it renders a bare signed-out button with no social sign-in or translations.
- Pages with a signed-in `customer` contain personal data: serve them with private caching. The `shop` settings are the same for every visitor and can be cached per shop and locale.

## Shop Settings from the Storefront API

The Storefront API returns the shop's enabled sign-in providers and its account sheet translations, the same data `<shopify-account>` would otherwise fetch itself. Changing the providers in the Shopify admin changes this list. Query it on the server and map it:

```ts
import {
  gql,
  type ShopifyAccountWidgetSocialLoginProvider,
  type StorefrontApi,
} from "@shopify/hydrogen";

const ACCOUNT_WIDGET_SHOP_QUERY = gql(`
  query AccountWidgetShop {
    shop {
      socialLoginProviders { handle }
      customerAccountTranslations { key value }
    }
  }
`);

const SUPPORTED_PROVIDERS = ["shop", "apple", "google", "facebook"];

function getAccountWidgetShop({ shop }: StorefrontApi.ResultOf<typeof ACCOUNT_WIDGET_SHOP_QUERY>) {
  return {
    // Handles arrive capitalized, such as `Shop`. Skip providers the widget doesn't support.
    socialLoginProviders: shop.socialLoginProviders
      .map(({ handle }) => handle.toLowerCase())
      .filter((handle): handle is ShopifyAccountWidgetSocialLoginProvider =>
        SUPPORTED_PROVIDERS.includes(handle),
      ),
    // Keys arrive prefixed, such as `account_menu.signed_in_state.greeting_with_name`.
    translations: Object.fromEntries(
      (shop.customerAccountTranslations ?? []).map(({ key, value }) => [
        key.replace(/^account_menu\./, ""),
        value,
      ]),
    ),
  };
}
```

Run the query with the app's Storefront API client and pass `getAccountWidgetShop(data)` as `accountWidget.shop`.

## Rules

- Render exactly one JSON script tag per page: pass `accountWidget` to a single `ShopifyScripts` (or `getShopifyScriptTags`) call. Render the widget elements anywhere, as many times as the layout needs (for example in the desktop header and the mobile menu).
- `<shopify-account>` reads the JSON once, when the element connects. After the data changes (sign-in, sign-out, profile update, client-side navigation with new loader data), remount every `<shopify-account>`. The React and Vue `AccountWidget` components do this automatically; framework-agnostic code must do it by hand.
- `AccountWidget` signs in through Hydrogen's `/account/login` route from `createCustomerAccountServerHandlers`, which forwards the `login_hint`, `login_hint_mode`, and `acr_values` query parameters the component adds.
- Replace the signed-out avatar with `AccountWidget`'s `fallback`. Style the sheet with the `--shopify-account-*` CSS variables. See https://shopify.dev/docs/api/storefront-web-components/components/shopify-account.
