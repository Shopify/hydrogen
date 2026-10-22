# React

Pass the data to `ShopifyScripts` once, in the root document. Render `ShopifyAccount` wherever the widget should appear:

```tsx
import { ShopifyAccount, ShopifyScripts } from "@shopify/hydrogen/react";

export function Layout({ children, accountWidget, shop }) {
  return (
    <html lang="en">
      <head>
        <ShopifyScripts shop={shop} accountWidget={accountWidget} />
      </head>
      <body>
        <header>
          <ShopifyAccount>
            <img slot="signed-out-avatar" src="/icons/user.svg" alt="Sign in" />
          </ShopifyAccount>
        </header>
        {children}
      </body>
    </html>
  );
}
```

- `accountWidget` comes from the root loader or server component, built on the server with `customer: null` for signed-out visitors.
- If the app later drops `accountWidget`, the widgets remount without data and fall back to their own Storefront API requests. Keep passing it while the widget is on the page.
- When `accountWidget` changes, `ShopifyScripts` updates the JSON script tag and every `ShopifyAccount` remounts after that commit. Changes are compared by value, so a new object with the same data doesn't remount anything.
- `ShopifyAccount` passes other props, such as `className` and `style`, to `<shopify-account>`.
- `ShopifyAccount` is a client component. In Next.js App Router, render it from a client component, like `ShopifyScripts`.
