# Seo

## Render the Seo component in the root component

Hydrogen provides an Seo component that collects the data defined in the handle export of each route module. You can add this component in the `<head />` tag of the root file:

### In file `/root.tsx`

```tsx before
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
```

```tsx after
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';

import {Seo} from '@shopify/hydrogen';

export default function App() {
  return (
    <html lang="en">
      <head>
        <Seo />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
```

## Define global SEO values in the root component

### In file `/root.tsx`

```tsx before
export async function loader() {
  // Your loader logic
}
```

```tsx after
export async function loader() {
  const seo = {};

  return defer({
    seo,
  });
}
```
