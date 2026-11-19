---
"@shopify/hydrogen": minor
---

`createCustomerAccountServerHandlers` now also serves `GET /account/widget-data`, the JSON that Shopify's `<shopify-account>` component reads from its `account-data-url` attribute. The route returns the signed-in customer's name, email, and avatar, or `customer: null` for signed-out visitors, plus the shop's sign-in providers and account sheet translations for the request's locale. The customer's access token stays on the server.

```tsx
function AccountButton() {
  const { pathPrefix } = useLocale();
  return (
    <shopify-account
      account-data-url={`${pathPrefix}/account/widget-data`}
      sign-in-url={`${pathPrefix}/account/login`}
    >
      <div slot="signed-out-avatar">Sign in</div>
    </shopify-account>
  );
}
```

Load the component with `<ShopifyScripts account />`. Build `account-data-url` and `sign-in-url` from `useLocale().pathPrefix`, so a page under a locale prefix, such as `/fr-ca`, requests `/fr-ca/account/widget-data` and gets the account sheet in its own language, and sign-in starts in the same locale's country. A storefront without `LocaleProvider` has one locale and can use `/account/widget-data` and `/account/login` as they are. The route refreshes expired access tokens and commits the session, and its responses are private and uncacheable. When the Customer Account API rejects the access token with a `401` status, the route clears it and returns `customer: null`; other Storefront API or Customer Account API failures return a `502` error instead of partial data. The refresh and API requests share an 8-second deadline, within the component's 10-second timeout. With `cartServerHandlers`, a refresh or sign-out on this route attaches or detaches the cart's customer, like the refresh route. The route needs a customer session from `createCustomerSession`. The path is exported as `CUSTOMER_ACCOUNT_WIDGET_DATA_PATH`.
