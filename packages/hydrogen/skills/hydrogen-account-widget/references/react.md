# React

Pass the data to `ShopifyScripts` once, in the root document. Render `AccountWidget` wherever the widget should appear:

```tsx
import { AccountWidget, ShopifyScripts } from "@shopify/hydrogen/react";

export function Layout({ children, accountWidget, shop }) {
  return (
    <html lang="en">
      <head>
        <ShopifyScripts shop={shop} accountWidget={accountWidget} />
      </head>
      <body>
        <header>
          <AccountWidget fallback={<img src="/icons/user.svg" alt="Sign in" />} />
        </header>
        {children}
      </body>
    </html>
  );
}
```

- `accountWidget` comes from the root loader or server component, built on the server with `customer: null` for signed-out visitors.
- If the app later drops `accountWidget`, the widgets remount without data and fall back to their own Storefront API requests. Keep passing it while the widget is on the page.
- When `accountWidget` changes, `ShopifyScripts` updates the JSON script tag and every `AccountWidget` remounts after that commit. Changes are compared by value, so a new object with the same data doesn't remount anything.
- `fallback` replaces the signed-out avatar. `AccountWidget` puts it in the component's `signed-out-avatar` slot for you.
- `AccountWidget` passes other props, such as `className` and `style`, to `<shopify-account>`.
- `AccountWidget` is a client component. In Next.js App Router, render it from a client component, like `ShopifyScripts`.
