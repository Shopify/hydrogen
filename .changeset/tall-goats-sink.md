---
'@shopify/hydrogen': minor
---

Add `countryCode` parameter to Customer Account API login

Adds support for setting the country context during customer authentication. This allows merchants to provide region-specific experiences by passing a `CountryCode` to the login method.

### What's new

- Added `countryCode` optional parameter to `customer.login()` options
- The country code is passed to Shopify's authentication service as the `region_country` parameter
- Supports all ISO 3166-1 alpha-2 country codes (e.g., 'US', 'CA', 'GB', 'AU')

### Usage

```tsx
// Basic usage with country code
const response = await customer.login({
  countryCode: 'US'
});

// Combine with locale for full localization
const response = await customer.login({
  uiLocales: 'FR',
  countryCode: 'CA'  // French-speaking customer in Canada
});

// Use with dynamic country detection
const detectedCountry = getCountryFromRequest(request);
const response = await customer.login({
  countryCode: detectedCountry
});
```

### Migration

This is a non-breaking change. The `countryCode` parameter is optional and existing implementations will continue to work without modification.
