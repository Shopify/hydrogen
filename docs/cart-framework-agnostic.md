# Hydrogen Cart & Storefront: Framework-Agnostic Architecture

## Overview

Hydrogen's cart and storefront APIs are designed as framework-agnostic primitives. The core libraries have **zero React Router dependencies** — framework coupling only exists in convenience wrappers (`CartForm`, `useOptimisticCart`, `createHydrogenContext`) that are optional.

This means the same cart factories and storefront client that power Hydrogen/Remix apps can be used in Next.js, SvelteKit, Nuxt, or any server-side JavaScript framework.

```
@shopify/hydrogen
├── Main entry (.)           ← Bundles everything, including React Router wrappers
├── @shopify/hydrogen/cart       ← Framework-agnostic cart factories + fragments
└── @shopify/hydrogen/storefront ← Framework-agnostic storefront client
```

## Architecture

### The Storefront Client

`createStorefrontClient` wraps the Storefront API with typed `query()`/`mutate()` methods, error handling, header management, and i18n support.

```ts
import { createStorefrontClient } from '@shopify/hydrogen/storefront';

const { storefront } = createStorefrontClient({
  storeDomain: 'https://my-store.myshopify.com',
  publicStorefrontToken: '...',
  storefrontApiVersion: '2026-01',
});

// Returns data directly — no { status, body } wrapper
const { products } = await storefront.query(PRODUCTS_QUERY);
```

**What it handles:** API URL construction, auth headers, SDK version headers, i18n variable injection, GraphQL error formatting with request IDs and SFAPI links.

**What it doesn't handle:** Caching and request lifecycle (`cache`, `waitUntil`). These are optional params designed for Oxygen/Cloudflare Workers. Other frameworks provide their own caching (Next.js `'use cache'`, SvelteKit `setHeaders`, etc.).

### Cart Factories

Cart operations use a **double-curried factory pattern** for tree-shaking:

```
factory(config) → (options) → (...args) → Promise<result>
  ↑ fragment override    ↑ storefront + cartId    ↑ operation input
```

Each layer serves a purpose:
1. **Config** — Override GraphQL fragments at import time
2. **Options** — Bind the storefront client and cart ID getter at request time
3. **Invocation** — Execute the actual cart operation

```ts
import { cartLinesAddDefault } from '@shopify/hydrogen/cart';

// All three layers in one call:
const result = await cartLinesAddDefault({ mutation: CUSTOM_FRAGMENT })({
  storefront,
  getCartId: () => cartId,
})(lines);
```

**Available factories:** `cartGetDefault`, `cartCreateDefault`, `cartLinesAddDefault`, `cartLinesRemoveDefault`, `cartLinesUpdateDefault`, `cartDiscountCodesUpdateDefault`, `cartBuyerIdentityUpdateDefault`, `cartNoteUpdateDefault`, `cartAttributesUpdateDefault`, `cartMetafieldsSetDefault`, `cartMetafieldDeleteDefault`, `cartGiftCardCodesAddDefault`, `cartGiftCardCodesRemoveDefault`, `cartSelectedDeliveryOptionsUpdateDefault`, plus delivery address operations.

Only import the ones you use — unused factories are tree-shaken.

Not too keen on the naming, but this was kept for sake of not changing too much all at once.

### What the Factories Need

The `CartQueryOptions` interface is minimal:

```ts
type CartQueryOptions = {
  storefront: Storefront;                    // from createStorefrontClient
  getCartId: () => string | undefined;       // framework provides this
  cartFragment?: string;                     // optional GraphQL override
  customerAccount?: CustomerAccount;         // optional, for logged-in carts
};
```

The `Storefront` type from `createStorefrontClient` satisfies this directly — no adapter needed.

## Implementing in Next.js

Reference implementation: `templates/next-commerce/`

### Storefront Client (module-level)

```ts
// lib/shopify/index.ts
import { createStorefrontClient } from '@shopify/hydrogen/storefront';

// In Hydrogen/Remix, this is per-request (for buyer IP, cookies, etc.).
// In Next.js a public token at module-level.
const { storefront } = createStorefrontClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
  publicStorefrontToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
  storefrontApiVersion: '2026-01',
  // No cache/waitUntil — Next.js uses 'use cache' directives instead.
});

export { storefront };

```

This seems sparse. Seems like some stuff is still missing. But will be good to figure out based on our findings with analytics.

### Cart Operations

```ts
// lib/shopify/cart.ts
import { cookies } from 'next/headers';
import { cartGetDefault, cartLinesAddDefault } from '@shopify/hydrogen/cart';
import { storefront } from './index';

export async function getCart() {
  const cartId = (await cookies()).get('cartId')?.value;
  if (!cartId) return undefined;

  return await cartGetDefault({ query: CUSTOM_CART_FRAGMENT })({
    storefront,
    getCartId: () => cartId,
  } as any)();
}

export async function addToCart(lines) {
  const cartId = (await cookies()).get('cartId')?.value!;

  return await cartLinesAddDefault({ mutation: CUSTOM_MUTATION_FRAGMENT })({
    storefront,
    getCartId: () => cartId,
  } as any)(lines);
}
```

### Caching

```ts
export async function getProduct(handle: string) {
  'use cache';
  cacheTag('products');
  cacheLife('days');

  const { product } = await storefront.query<ProductData>(PRODUCT_QUERY, {
    variables: { handle },
  });
  return product;
}
```

Hydrogen's `CacheShort`/`CacheLong` strategies are **not used** — Next.js `'use cache'` directives handle caching at the framework level.

## Implementing in Other Frameworks

### SvelteKit

```ts
// src/lib/shopify.server.ts
import { createStorefrontClient } from '@shopify/hydrogen/storefront';
import { cartGetDefault } from '@shopify/hydrogen/cart';

const { storefront } = createStorefrontClient({ ... });

// In a +page.server.ts load function:
export async function load({ cookies }) {
  const cartId = cookies.get('cartId');
  const cart = await cartGetDefault()({
    storefront,
    getCartId: () => cartId,
  } as any)();
  return { cart };
}
```

### Express / Node.js

```ts
import { createStorefrontClient } from '@shopify/hydrogen/storefront';
import { cartLinesAddDefault } from '@shopify/hydrogen/cart';
import cookieParser from 'cookie-parser';

const { storefront } = createStorefrontClient({ ... });

app.post('/cart/add', async (req, res) => {
  const cartId = req.cookies.cartId;
  const result = await cartLinesAddDefault()({
    storefront,
    getCartId: () => cartId,
  } as any)(req.body.lines);

  res.cookie('cartId', result.cart.id);
  res.json(result);
});
```

### Pattern Across Frameworks

The framework-specific parts are always the same three things:
1. **Reading the cart ID** — from cookies, session, etc.
2. **Persisting the cart ID** — setting cookies after create/mutation
3. **Caching** — framework's own caching layer, not Hydrogen's `Cache` API

Everything else is shared.

## Tradeoffs

### What You Get

- **Storefront API best practices built in.** GraphQL validation, error formatting with request IDs and SFAPI links, SDK headers, i18n variable injection — things you'd otherwise re-implement per framework.
- **Cart operations without reinventing GraphQL mutations.** The factories encode Shopify's cart API surface: correct mutation shapes, user error handling, `@defer` support, buyer identity merging.
- **Tree-shaking.** Import only the cart operations you need. The factory pattern ensures unused operations don't bloat your bundle.
- **Fragment customization.** Override any cart fragment to fetch exactly the fields your UI needs, without forking the library.

### What You Give Up

- **No Hydrogen caching.** `CacheShort`/`CacheLong` are designed for Cloudflare Workers/Oxygen (Web Cache API + `waitUntil`). Outside those runtimes, you must provide your own caching. The storefront client logs a dev warning about this — it's expected.
- **No optimistic cart UI.** `useOptimisticCart` is React Router-specific (depends on `useFetchers`). Other frameworks need their own optimistic update pattern.
- **No `CartForm` component.** This is a React Router `<fetcher.Form>` wrapper. You'll write your own form/action handling.
- **No auto-create wrapping.** `createCartHandler` provides auto-create logic (add-to-cart creates a cart if none exists). The individual factories don't — you handle that conditional yourself.
- **`as any` casts on factory options.** The `CartQueryOptions` type expects the full `Storefront` type, which includes cache methods (`CacheNone`, etc.) even though they're not used by most factories. In practice this is harmless — the factories only call `storefront.query()`, `storefront.mutate()`, and `storefront.i18n`.

### Risk Profile

| Decision | Risk | Mitigation |
|----------|------|------------|
| Module-level storefront client | Can't inject per-request headers (buyer IP, cookies) | Only an issue with private tokens. Public tokens don't need request context. For private tokens, create the client per-request. |
| Custom cart fragments | Must keep fragment names aligned (`CartApiQuery`, `CartApiMutation`) | These names are stable — they're baked into the factory query wrappers. |
| No `waitUntil` | Background cache writes won't happen | Acceptable when using framework-level caching (`'use cache'`, CDN, etc.) |
| `as any` on factory options | Type safety gap | Narrow — the runtime interface is satisfied. Could be fixed upstream by making cache methods optional on the type. |

## Current Gotchas

### 1. The Main Entry Bundles React

`import { createStorefrontClient } from '@shopify/hydrogen'` pulls in React client components (`ShopifyProvider`, hooks, etc.) via `@shopify/hydrogen-react`. This **breaks Next.js builds** with Turbopack errors about `createContext` in server components.

**Fix:** Use the subpath imports:
```ts
import { createStorefrontClient } from '@shopify/hydrogen/storefront';
import { cartGetDefault } from '@shopify/hydrogen/cart';
```

### 2. `moduleResolution: "node"` Can't Resolve Subpath Exports

TypeScript's `"moduleResolution": "node"` doesn't support package.json `exports` fields. You'll get "Cannot find module '@shopify/hydrogen/storefront'" errors even though the runtime resolves fine.

**Fix:** Set `"moduleResolution": "bundler"` in tsconfig.json. This is the recommended setting for modern bundlers (Turbopack, Vite, webpack 5, esbuild).

### 3. Default Cart Fragments May Not Have Your Fields

Hydrogen's `DEFAULT_CART_FRAGMENT` and `DEFAULT_CART_MUTATION_FRAGMENT` include a standard set of cart fields. If your UI needs additional product fields (e.g., `featuredImage`, `productType`), you must provide custom fragments.

**The fragment name matters.** Query fragments must be named `CartApiQuery`, mutation fragments must be named `CartApiMutation` — the factory wrappers reference these names.

### 4. Dev Warning About Missing Cache

```
[h2:warn:createStorefrontClient] Storefront API client created without a cache instance.
```

This fires in development when no `cache` option is passed. It's informational — Hydrogen's cache layer is designed for Oxygen/Cloudflare, and you're expected to use your framework's caching instead. The warning can't be silenced without passing a cache instance.

### 5. Cart ID Format

Hydrogen's `cartGetIdDefault` expects cookies in the format `cart={uuid}` and converts to `gid://shopify/Cart/{uuid}`. The factories expect the full GraphQL ID format (`gid://shopify/Cart/...`). If you manage cart IDs yourself, make sure you're passing the full GID.

### 6. `storefront.query()` Types Are Untyped by Default

Without Hydrogen's codegen integration, `storefront.query()` returns `any`. You need to pass explicit type parameters:

```ts
const { product } = await storefront.query<{ product: Product }>(QUERY, { ... });
```

Hydrogen apps with codegen get automatic typing via the `StorefrontQueries` interface augmentation — this isn't available outside the Hydrogen Vite plugin.

## What's Framework-Coupled vs Agnostic

| Component | Agnostic? | Import Path |
|-----------|-----------|-------------|
| `createStorefrontClient` | Yes | `@shopify/hydrogen/storefront` |
| All `cart*Default` factories | Yes | `@shopify/hydrogen/cart` |
| `createCartHandler` | Yes | `@shopify/hydrogen/cart` |
| `cartGetIdDefault` / `cartSetIdDefault` | Yes | `@shopify/hydrogen/cart` |
| Cart fragments | Yes | `@shopify/hydrogen/cart` |
| `CartForm` | No (React Router) | `@shopify/hydrogen` |
| `useOptimisticCart` | No (React Router) | `@shopify/hydrogen` |
| `createHydrogenContext` | No (React Router) | `@shopify/hydrogen` |
| `CacheShort` / `CacheLong` / etc. | Yes (but Oxygen-optimized) | `@shopify/hydrogen` |

## Future Considerations

- **Type narrowing for `CartQueryOptions`:** Making `CacheNone` and other cache methods optional on the `Storefront` type would eliminate the `as any` casts needed when passing the storefront client to cart factories.
- **Silencing the cache warning:** A `logWarnings: false` option or detecting when no cache is intentional would improve DX for non-Oxygen frameworks.
- **Per-request storefront factory:** A documented `getStorefront(request)` pattern for frameworks that need per-request headers (private tokens, buyer IP forwarding).
- **Codegen for non-Vite setups:** Enabling `StorefrontQueries` augmentation outside the Hydrogen Vite plugin would give type-safe queries to all frameworks.
