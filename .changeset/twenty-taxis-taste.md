---
'skeleton': patch
---

Fix types returned by the `session` object.

In `remix.env.d.ts` or `env.d.ts`, add the following types:

```diff
import type {
  // ...
  HydrogenCart,
+ HydrogenSessionData,
} from '@shopify/hydrogen';

// ...

declare module '@shopify/remix-oxygen' {
  // ...

+ interface SessionData extends HydrogenSessionData {}
}
```
