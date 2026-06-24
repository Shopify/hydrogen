import type { Metadata } from "next";

import { CartContent } from "@/components/Cart";

export const metadata: Metadata = {
  title: "Cart — Mock.shop",
};

export default function CartPage() {
  return <CartContent />;
}
