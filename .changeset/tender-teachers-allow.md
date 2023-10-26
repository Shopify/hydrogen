---
'@shopify/hydrogen-react': patch
'@shopify/hydrogen': patch
---

The Storefront API types included are now generated using `@graphql-codegen/typescript@4` ([changelog](https://github.com/dotansimha/graphql-code-generator/blob/master/packages/plugins/typescript/typescript/CHANGELOG.md#400)). This results in a breaking change if you were importing `Scalars` directly from `@shopify/hydrogen-react` or `@shopify/hydrogen`.

Before:

```tsx
import type {Scalars} from '@shopify/hydrogen/storefront-api-types';

type Props = {
  id: Scalars['ID']; // This was a string
};
```

After:

```tsx
import type {Scalars} from '@shopify/hydrogen/storefront-api-types';

type Props = {
  id: Scalars['ID']['input']; // Need to access 'input' or 'output' to get the string
};
```
