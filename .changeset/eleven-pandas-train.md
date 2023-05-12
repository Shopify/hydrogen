---
'@shopify/remix-oxygen': patch
---

Add a default `Powered-By: Shopify-Hydrogen` header. It can be disabled by passing `poweredByHeader: false` in the configuration object of `createRequestHandler`:

```ts
import {createRequestHandler} from '@shopify/remix-oxygen';

export default {
  async fetch(request) {
    // ...
    const handleRequest = createRequestHandler({
      // ... other properties included
      poweredByHeader: false,
    });
    // ...
  },
};
```
