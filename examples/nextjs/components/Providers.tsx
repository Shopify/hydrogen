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
  return <CartProvider initialData={cart}>{children}</CartProvider>;
}
