---
'skeleton': patch
'@shopify/hydrogen': patch
---

Change `<Analytics.Provider>` to set up Customer Privacy without the Shopify's cookie banner by default.

# Breaking Change

If you are using `<Analytics.Provider>` in your app, you need to add `withPrivacyBanner={true}` to the `<AnalyticsProvider>` component if you are using the Shopify's cookie banner. Without this props, the Shopify cookie banner will not appear.

```diff
  <Analytics.Provider
    cart={data.cart}
    shop={data.shop}
    consent={data.consent}
+    withPrivacyBanner={true}
  >
  ...
</Analytics.Provider>
```
