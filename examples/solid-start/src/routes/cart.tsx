import { Title } from "@solidjs/meta";

import { Cart } from "../components/Cart";

export default function CartPage() {
  return (
    <main id="main-content" tabIndex={-1} class="mx-auto max-w-3xl px-6 py-16 md:py-20">
      <Title>Cart — Mock.shop</Title>
      <h1 class="text-6xl font-black tracking-tight md:text-8xl">Cart</h1>
      <div class="mt-12">
        <Cart />
      </div>
    </main>
  );
}
