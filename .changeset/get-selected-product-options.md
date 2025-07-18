---
'@shopify/hydrogen': patch
---

Re-implement `getSelectedProductOptions` utility as a standalone function

The `getSelectedProductOptions` utility has been re-implemented as a standalone function after the deprecation of `VariantSelector`. This ensures the utility remains available for extracting selected product options from URL search parameters.

```tsx
import {getSelectedProductOptions} from '@shopify/hydrogen';

// Given a request url of `/products/product-handle?color=red&size=large`
const selectedOptions = getSelectedProductOptions(request);
// Returns: [{name: 'color', value: 'red'}, {name: 'size', value: 'large'}]
```