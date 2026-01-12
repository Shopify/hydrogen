---
'@shopify/hydrogen': patch
---

Adds two new optional parameters to the `customerAccount.login()` method for more control over the authentication flow:

### `acrValues`

Specifies Authentication Context Class Reference values, which can be used to request specific authentication methods or identity providers. When provided, it's passed as the `acr_values` query parameter to the OAuth authorization URL.

Common use case: Triggering social login flows (e.g., `'provider:google'` to initiate Google sign-in).

### `loginHint`

Pre-populates the login form with an email address. When provided, it's passed as the `login_hint` query parameter to the OAuth authorization URL.

Common use case: Streamlining the login experience when you already know the user's email from a previous interaction.

### Usage

```tsx
// Trigger Google social login
await context.customerAccount.login({
  acrValues: 'provider:google',
});

// Pre-fill email on login form
await context.customerAccount.login({
  loginHint: 'customer@example.com',
});

// Combine with existing options
await context.customerAccount.login({
  countryCode: context.storefront.i18n.country,
  acrValues: 'provider:google',
  loginHint: 'customer@example.com',
});
```

### Migration

This is a non-breaking change. Both parameters are optional and existing implementations will continue to work without modification.
