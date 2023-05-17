---
'@shopify/cli-hydrogen': minor
---

Add **UNSTABLE** support for GraphQL Codegen to automatically generate types for every Storefront API query in the project via `@shopify/hydrogen-codegen`.

> Note: This feature is unstable and subject to change in patch releases.

How to use it while unstable:

1. Write your queries/mutations in `.ts` or `.tsx` files and use the `#graphql` comment inside the strings. It's important that every query/mutation/fragment in your project has a **unique name**:

   ```ts
   const UNIQUE_NAME_SHOP_QUERY = `#graphql
     query unique_name_shop { shop { id } }
   `;
   ```

   If you use string interpolation in your query variables (e.g. for reusing fragments) you will need to specify `as const` after each interpolated template literal. This helps TypeScript infer the types properly instead of getting a generic `string` type:

   ```ts
   const UNIQUE_NAME_SHOP_FRAGMENT = `#graphql
     fragment unique_name_shop_fields on Shop { id name }
   `;

   const UNIQUE_NAME_SHOP_QUERY = `#graphql
     query unique_name_shop { shop { ...unique_name_shop_fields } }
     ${UNIQUE_NAME_SHOP_FRAGMENT}
   ` as const;
   ```

2. Pass the queries to the Storefront client and do not specify a generic type value:

   ```diff
   -import type {Shop} from '@shopify/hydrogen/storefront-api-types';
   // ...
   -const result = await storefront.query<{shop: Shop}>(UNIQUE_NAME_SHOP_QUERY);
   +const result = await storefront.query(UNIQUE_NAME_SHOP_QUERY);
   ```

3. Pass the flag `--codegen-unstable` when running the development server, or use the new `codegen-unstable` command to run it standalone without a dev-server:

   ```bash
   npx shopify hydrogen dev --codegen-unstable # Dev server + codegen watcher
   npx shopify hydrogen codegen-unstable # One-off codegen
   npx shopify hydrogen codegen-unstable --watch # Standalone codegen watcher
   ```

As a result, a new `storefrontapi.generated.d.ts` file should be generated at your project root. You don't need to reference this file from anywhere for it to work, but you should commit it every time the types change.

**Optional**: you can tune the codegen configuration by providing a `<root>/codegen.ts` file (or specify a different path with the `--codegen-config-path` flag) with the following content:

```ts
import type {CodegenConfig} from '@graphql-codegen/cli';
import {preset, pluckConfig, schema} from '@shopify/hydrogen-codegen';

export default <CodegenConfig>{
  overwrite: true,
  pluckConfig,
  generates: {
    ['storefrontapi.generated.d.ts']: {
      preset,
      schema,
      documents: ['*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    },
  },
};
```

Feel free to add your custom schemas and generation config here or read from different document files. Please, report any issue you find in our repository.
