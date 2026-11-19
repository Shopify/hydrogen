---
"@shopify/hydrogen": minor
---

`createCustomerAccountServerHandlers` now also serves `GET /account/widget-data`, the JSON that Shopify's `<shopify-account>` component reads from its `account-data-url` attribute. The route returns the signed-in customer's name and email, or `customer: null` for signed-out visitors, plus the shop's sign-in providers and account sheet translations for the request's locale. The customer's access token stays on the server.

Render the component with the new `ShopifyAccount` component from `@shopify/hydrogen/react` or `@shopify/hydrogen/vue`, and load its script with `<ShopifyScripts account />`:

```tsx
<ShopifyAccount signedOutAvatar="Sign in" />
```

`ShopifyAccount` points `account-data-url` and `sign-in-url` at the widget data and login routes, and renders `signedOutAvatar` in the component's `signed-out-avatar` slot (a named `signedOutAvatar` slot in Vue). Inside `LocaleProvider`, both carry the locale's path prefix, such as `/fr-ca/account/widget-data`, so the account sheet shows in the page's language and sign-in starts in the locale's country.

The route refreshes expired access tokens and commits the session, and its responses are private and uncacheable. When the Customer Account API rejects the access token with a `401` status, the route clears it and returns `customer: null`; other Storefront API or Customer Account API failures return a `502` error instead of partial data. The refresh and API requests share an 8-second deadline, within the component's 10-second timeout. With `cartServerHandlers`, a refresh or sign-out on this route attaches or detaches the cart's customer, like the refresh route. The route needs a customer session from `createCustomerSession`. The path is exported as `CUSTOMER_ACCOUNT_WIDGET_DATA_PATH`.
