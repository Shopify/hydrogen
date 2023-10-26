---
'demo-store': patch
---

If you are calling `useMatches()` in different places of your app to access the data returned by the root loader, you may want to update it to the following pattern to enhance types:

```ts
// root.tsx

import {useMatches} from '@remix-run/react';
import {type SerializeFrom} from '@shopify/remix-oxygen';

export const useRootLoaderData = () => {
  const [root] = useMatches();
  return root?.data as SerializeFrom<typeof loader>;
};

export function loader(context) {
  // ...
}
```

This way, you can import `useRootLoaderData()` anywhere in your app and get the correct type for the data returned by the root loader.
