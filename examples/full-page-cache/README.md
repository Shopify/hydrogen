# Hydrogen example: Full-page Cache

This is an exmaple of using full page cache with Hydrogen. It is enabled for all pages other than the accounts and cart routes. It massively improves the performance of the rest of the app, but has the following implications:

1. The cart and account status is no longer server-side rendered. This means they load slightly slower, because the browser fetches data after JavaScript executes. Even with this, the app still properly functions without JavaScript enabled, just the cart in the header won't show how many items are in the cart.
2. Make sure not to add any logic to a page that is personalized or dynamic, because this won't behave properly with full page cache. The rendered content from one user will be sent to another user, introducing a security vulnerability.

## Install

Setup a new project with this example:

```bash
npm create @shopify/hydrogen@latest -- --template full-page-cache
```

## Requirements

- You are hosting on [Oxygen](https://shopify.dev/docs/storefronts/headless/hydrogen/caching/full-page-cache).
- You are not servering personalized content on cached pages.

## Key files

This folder contains the minimal set of files needed to showcase the implementation. Files that aren’t included by default
with Hydrogen and that you’ll need to create are labeled with 🆕.

| File                                                                    | Description                                                                                                                                                                                                           |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`app/routes/cart.tsx`](app/routes/cart.tsx)                            | Add a loader to query the cart data. The `CartProvider` component dynamically calls this loader to qet the cart data. Also added a `shouldRevalidate` to make sure the cart is only ever revalidated on cart actions. |
| 🆕 [`app/components/CartProvider.tsx`](app/components/CartProvider.tsx) | Add a React context provider to make it easy to access the cart data anywhere in the app.                                                                                                                             |
| 🆕 [`app/routes/account.status.tsx`](app/routes/account.status.tsx)     | A new resource route that allows the browser to query the status of the logged in user. This is necessary because the logged in user is no longer server rendered in the base document.                               |
| [`app/server.ts`](app/server.ts)                                        | Add the oxygen cache headers on all requests except for `/cart` and `/account/*`.                                                                                                                                     |
| [`app/root.tsx`](app/root.tsx)                                          | Change the account and cart to be returned from the root loader                                                                                                                                                       |
