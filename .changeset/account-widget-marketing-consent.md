---
"@shopify/hydrogen": minor
---

The `<shopify-account>` sign-in form can now collect marketing consent. `GET /account/widget-data` returns the shop's `marketingConsentSigninEnabled` and `marketingConsentPreselected` settings, so the form shows the marketing consent checkbox when the shop collects consent at sign-in. The login route at `/account/login` forwards the customer's choice to Shopify as the `marketing_consent` search param when the value is `true` or `false`.

The two settings exist only in the `unstable` Storefront API version, so the widget data route sends one extra request to that version. When that request fails or takes longer than 2 seconds, the route logs a warning and returns both settings as `false`. `marketingConsentPreselected` is also `false` whenever `marketingConsentSigninEnabled` is `false`.

The `unstable` version has no stability guarantee. If Shopify renames or removes these fields there, every widget data request still sends the extra request, uncached, and logs the warning until you upgrade Hydrogen.

`prepareLoginUrl` accepts the same choice as a `marketingConsent` boolean:

```ts
await customerSession.prepareLoginUrl(sessionManager, requestContext, {
  marketingConsent: true,
});
```
