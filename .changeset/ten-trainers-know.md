---
'demo-store': patch
'@shopify/create-hydrogen': patch
---

Remix's default error logging does not include stack traces. It is important to update your `entry.server.tsx` file to export an `errorHandler` function that logs the stack:

```tsx
import type {DataFunctionArgs} from '@shopify/remix-oxygen';

/* ... */

export function handleError(error: any, {request}: DataFunctionArgs) {
  if (!request.signal.aborted) {
    console.error((error as Error)?.stack ? (error as Error).stack : error);
  }
}
```
