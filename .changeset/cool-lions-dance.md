---
'@shopify/hydrogen': patch
---

Add `loginHintMode` parameter to Customer Account login

Adds a new optional `loginHintMode` parameter to the `customerAccount.login()` method. When provided along with `loginHint`, it's passed as the `login_hint_mode` query parameter to the OAuth authorization URL. The only supported value is `'submit'`. This parameter is ignored if `loginHint` is not provided.

When set to `'submit'` along with `loginHint`, the login form will automatically submit with the provided email, skipping the email input step.

### Usage

```tsx
// Auto-submit with a known email
await context.customerAccount.login({
  loginHint: 'customer@example.com',
  loginHintMode: 'submit',
});
```

### Migration

This is a non-breaking change. The parameter is optional and existing implementations will continue to work without modification.
