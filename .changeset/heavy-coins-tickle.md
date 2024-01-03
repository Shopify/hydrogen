---
'@shopify/hydrogen': patch
---

✨ add `applyDefault` option to `createContentSecurityPolicy` which automatically adds Shopify domains to the content security policy, extending whatever rules are passed instead of overriding them. The default value of `applyDefault` option is false which is the current behavior.

Example usage:

```diff
const {nonce, header, NonceProvider} = createContentSecurityPolicy(
  {connectSrc: 'wss://public-domain:*'},
+ {applyDefault: true},
);
```

Result of connect-src when `applyDefault=false` is "wss://public-domain:\*"

Result of connect-src when `applyDefault=true` is "wss://public-domain:\* 'self' 'https://cdn.shopify.com' 'https://shopify.com'"
