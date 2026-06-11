import { CartContent } from "../components/Cart";

export function meta() {
  return [{ title: "Cart — Hydrogen" }];
}

export default function CartRoute() {
  return <CartContent />;
}
