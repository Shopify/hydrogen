---
'@shopify/hydrogen': patch
---

✨ add applyDefault option to createContentSecurityPolicy which allow use to add policy in front of the existing rules instead of overriding them. The default value of applyDefault option is false which is the current behaviour.

Example usage:

```diff
const {nonce, header, NonceProvider} = createContentSecurityPolicy(
  {connectSrc: 'wss://public-domain:*'},
+ {applyDefault: true},
);
```

Result of connect-src when `applyDefault=false` is "wss://public-domain:\*"

Result of connect-src when `applyDefault=true` is "wss://public-domain:\* 'self' 'https://cdn.shopify.com' 'https://shopify.com'"
