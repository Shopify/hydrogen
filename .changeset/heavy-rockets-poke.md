---
'@shopify/cli-hydrogen': minor
'demo-store': minor
---

Support Remix Hot Module Replacement (HMR) and Hot Data Revalidation (HDR).
Start using it with the following changes to your project:

1. Upgrade to the latest Hydrogen version and Remix 1.19.1.

2. Enable the v2 dev server in `remix.config.js`:

```diff
// ...
future: {
+ v2_dev: true,
  v2_meta: true,
  v2_headers: true,
  // ...
}
```

3. Add Remix' `<LiveReload />` component if you don't have it to your `root.jsx` or `root.tsx` file:

```diff
import {
  Outlet,
  Scripts,
+ LiveReload,
  ScrollRestoration,
} from '@remix-run/react';

// ...

export default function App() {
  // ...

  return (
    <html>
      <head>
       {/* ...  */}
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
+       <LiveReload />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  // ...

  return (
    <html>
      <head>
        {/* ... */}
      </head>
      <body>
        Error!
        <Scripts />
+       <LiveReload />
      </body>
    </html>
  );
}
```
