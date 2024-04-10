---
'@shopify/mini-oxygen': major
---

The default runtime exported from `@shopify/mini-oxygen` is now based on workerd.

The previous Node.js sandbox runtime has been moved to the `@shopify/mini-oxygen/node` export.

Example usage:

```js
import {createMiniOxygen} from '@shopify/mini-oxygen';

const miniOxygen = createMiniOxygen({
  workers: [
    {
      name: 'main',
      modules: true,
      script: `export default {
        async fetch() {
          const response = await fetch("https://hydrogen.shopify.dev");
          return response;
        }
      }`,
    },
  ],
});

const response = await miniOxygen.dispatchFetch('http://placeholder');
console.log(await response.text());

await miniOxygen.dispose();
```
