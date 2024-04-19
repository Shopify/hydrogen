---
'skeleton': patch
---

To improve HMR in Vite, move the `useRootLoaderData` function from `app/root.tsx` to a separate file like `app/lib/root-data.ts`. This change avoids circular imports:

```tsx
// app/lib/root-data.ts
import {useMatches} from '@remix-run/react';
import type {SerializeFrom} from '@shopify/remix-oxygen';
import type {loader} from '~/root';

/**
 * Access the result of the root loader from a React component.
 */
export const useRootLoaderData = () => {
  const [root] = useMatches();
  return root?.data as SerializeFrom<typeof loader>;
};
```

Import this hook from `~/lib/root-data` instead of `~/root` in your components.
