---
"@shopify/hydrogen": minor
---

`ProductPayload.price` is now `{ amount, currencyCode }`, the Storefront API `MoneyV2` shape, instead of a bare amount string. The hosted Shopify analytics script reads `currencyCode` as the event's currency, so `product_viewed` events no longer depend on `window.Shopify.currency.active` being set. Pass the variant's `price` object where you used to pass `price.amount`:

```ts
// before
price: variant.price.amount,
// after
price: variant.price,
```

This is a breaking type change for anyone publishing `product_viewed` with a string `price`. The new type is exported as `AnalyticsMoney`.
