---
'skeleton': patch
'@shopify/hydrogen': patch
---

Fixed React Context error that occurred during client-side hydration when using Content Security Policy (CSP) with nonces. The error "Cannot read properties of null (reading 'useContext')" was caused by the `NonceProvider` being present during server-side rendering but missing during client hydration.

#### Changes for Existing Projects

If you have customized your `app/entry.client.tsx` file, you may need to wrap your app with the `NonceProvider` during hydration to avoid this error:

```diff
// app/entry.client.tsx
import {HydratedRouter} from 'react-router/dom';
import {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
+ import {NonceProvider} from '@shopify/hydrogen';

if (!window.location.origin.includes('webcache.googleusercontent.com')) {
  startTransition(() => {
+   // Extract nonce from existing script tags
+   const existingNonce = document
+     .querySelector<HTMLScriptElement>('script[nonce]')
+     ?.nonce;
+
    hydrateRoot(
      document,
      <StrictMode>
-       <HydratedRouter />
+       <NonceProvider value={existingNonce}>
+         <HydratedRouter />
+       </NonceProvider>
      </StrictMode>,
    );
  });
}
```

This ensures the React Context tree matches between server and client rendering, preventing hydration mismatches.

#### Package Changes

- **@shopify/hydrogen**: Exported `NonceProvider` from the main package to allow client-side usage and simplified Vite configuration to improve React Context stability during development
- **skeleton**: Updated the template's `entry.client.tsx` to include the `NonceProvider` wrapper during hydration