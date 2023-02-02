---
'@shopify/hydrogen-react': patch
---

`<ShopifyProvider />` and `useShop()` have had a breaking update:

## `ShopifyProvider`

- `<ShopifyProvider />` previously accepted a single `shopifyConfig` object as a prop; now, each of the keys in this object are their own separate props.
- We also removed `country` and `language` as objects, and they are now strings with the names `countryIsoCode` and `languageIsoCode`, respectively.
- The `locale` prop has been removed completely; this was a duplicative prop that was a combination of `countryIsoCode` and `languageIsoCode`, so it made no sense to have to include it as well.

An example:

```tsx
// previously:

<ShopifyProvider
  shopifyConfig={{
    storeDomain: 'my-store',
    storefrontToken: 'abc123',
    storefrontApiVersion: '2022-10',
    country: {
      isoCode: 'CA',
    },
    language: {
      isoCode: 'EN',
    },
    locale: 'EN-CA',
  }}
>
  {/* rest of your client-side app */}
</ShopifyProvider>
```

```tsx
// now

<ShopifyProvider
  storeDomain="my-store"
  storefrontToken="abc123"
  storefrontApiVersion="2022-10"
  countryIsoCode="CA"
  languageIsoCode="EN"
>
  {/* rest of your client-side app */}
</ShopifyProvider>
```

## `useShop()`

As noted above, `locale` was removed from the `<ShopifyProvider />` component, and `countryIsoCode` and `languageIsoCode` were renamed. Here's an example of how the return value of `useShop()` was affected

```tsx
// before

const {country, language, locale} = useShop();

console.log(country.isoCode);
console.log(language.isoCode);
console.log(locale);
```

```tsx
// after

const {countryIsoCode, languageIsoCode} = useShop();

console.log(countryIsoCode);
console.log(languageIsoCode);
console.log(`${languageIsoCode}-${countryIsoCode}`);
```

Note that `locale` can be replicated by combining `languageIsoCode` and `countryIsoCode` with a hypthen (`-`) between them.
