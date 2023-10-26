---
'@shopify/hydrogen-codegen': minor
---

Removed the `patchGqlPluck` named export from the main entrypoint.

Added `@shopify/hydrogen-codegen/patch` entrypoint that automatically patches the necessary files. This is applied automatically by Hydrogen CLI.
If you're using the `graphql-codegen` CLI directly, you can either run it as a Node loader with `node -r @shopify/hydrogen-codegen/patch node_modules/.bin/graphql-codegen` or import it in your `codegen.ts` file before anything else:

```js
import '@shopify/hydrogen-codegen/patch';
import {preset, schema, pluckConfig} from '@shopify/hydrogen-codegen';

export default {
  overwrite: true,
  pluckConfig,
  generates: {
    'storefrontapi.generated.d.ts': {
      preset,
      schema,
      documents: ['...'],
    },
  },
};
```
