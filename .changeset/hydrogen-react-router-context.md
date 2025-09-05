---
'@shopify/hydrogen': minor
---

Add React Router 7.8.x support infrastructure

- **New**: Export `hydrogenContext` object containing all Hydrogen service context keys for use with React Router's `context.get()` pattern:
  ```ts
  import { hydrogenContext } from '@shopify/hydrogen';
  
  export async function loader({ context }) {
    const storefront = context.get(hydrogenContext.storefront);
    const cart = context.get(hydrogenContext.cart);
  }
  ```

- **New**: Add `react-router-preset` export for React Router configuration

- **New**: Export React Router type augmentations via `react-router.d.ts` for proper TypeScript support with `AppLoadContext` and `unstable_RouterContextProvider`

- **New**: Export `NonceProvider` for Content Security Policy support in React Router apps

- **New**: Add `HydrogenRouterContextProvider` interface extending React Router's context provider with Hydrogen services

The existing direct context access pattern continues to work alongside the new `context.get()` pattern:
```ts
export async function loader({ context }) {
  const { storefront, cart } = context;
}
```