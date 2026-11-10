# Next.js App Router

Next.js App Router cart bindings. This is the primary reference for promise-based cart seeding. For the framework-agnostic React story, see `react.md`.

With `cacheComponents: true`, keep the root layout as a static shell. Render an async `AppShell` inside `<Suspense>`, call `await connection()` there, create the cart read, and pass its promise to a `"use client"` provider wrapper as `initialData`. Do not `await` the cart before rendering the shell when the app is optimized for streaming. `CartProvider` tracks the promise and `useSuspenseCart()` lets cart content suspend locally, so the static shell can stream while cart views wait behind a cart-specific fallback.

```tsx
// app/providers.tsx
"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart";
import type { cartHandlers } from "@/lib/cart-handlers";

type CartData = Awaited<ReturnType<typeof cartHandlers.get>>["data"];

export function Providers({ cartData, children }: { cartData: Promise<CartData>; children: ReactNode }) {
  return <CartProvider initialData={cartData}>{children}</CartProvider>;
}
```

```tsx
// app/layout.tsx
import { Suspense } from "react";

import { AppShell } from "./app-shell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
```

```tsx
// app/app-shell.tsx
import { connection } from "next/server";

import { cartHandlers } from "@/lib/cart-handlers";
import { getStorefrontClient } from "@/lib/storefront";
import { Providers } from "./providers";

export async function AppShell({ children }: { children: React.ReactNode }) {
  await connection();

  const cartData = getStorefrontClient().then((storefrontClient) =>
    cartHandlers.get({ storefrontClient }).then(({ data }) => data),
  );

  return (
    <Providers cartData={cartData}>
      {children}
    </Providers>
  );
}
```

`cartHandlers.get()` marks the shell's request context personalized, but that mark doesn't reach the page response. `proxy.ts` sends the response headers before the shell renders, and `getStorefrontClient()` creates a separate request context. Next makes dynamic pages private by default, but it keeps a `Cache-Control` header that `proxy.ts` sets. Mark the response in `proxy.ts` when the request has a cart ID, before `requestContext.applyResponseHeaders()`:

```ts
if (getCartId(request)) requestContext.markResponseAsPersonalized("cart");
requestContext.applyResponseHeaders(response.headers);
```

See the `hydrogen-request-handlers` skill's Next.js reference for the full `proxy.ts`.

Wrap cart content that needs the full cart in a local Suspense boundary and read it with `useSuspenseCart()`:

```tsx
// components/CartContent.tsx
"use client";

import { Suspense } from "react";
import { useSuspenseCart } from "@/lib/cart";

function CartLoadingFallback() {
  return <p role="status">Loading cart…</p>;
}

export function CartContent() {
  return (
    <Suspense fallback={<CartLoadingFallback />}>
      <CartContentBody />
    </Suspense>
  );
}

function CartContentBody() {
  const cart = useSuspenseCart((state) => state.data);
  return <CartLines cart={cart} />;
}
```
