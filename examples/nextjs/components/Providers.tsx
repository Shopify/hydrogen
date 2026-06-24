"use client";

import { CartProvider } from "@/lib/cart";

type CartProviderProps = Parameters<typeof CartProvider>[0];

export function Providers({
  cart,
  children,
}: {
  cart?: CartProviderProps["initialData"];
  children: React.ReactNode;
}) {
  // TODO: allow cart provider to accept a promise from the server, then consume it with React.use()
  // This allows the layout to be non-blocking
  return <CartProvider initialData={cart}>{children}</CartProvider>;
}
