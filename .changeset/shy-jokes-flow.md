---
'@shopify/hydrogen': patch
---

Custom cart methods are now stable:

```diff
 const cart = createCartHandler({
   storefront,
   getCartId,
   setCartId: cartSetIdDefault(),
-  customMethods__unstable: {
+  customMethods: {
     addLines: async (lines, optionalParams) => {
      // ...
     },
   },
 });
```
