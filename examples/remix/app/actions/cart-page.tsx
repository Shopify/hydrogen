import type { Handle } from "remix/component";

import { CartPage as CartPageContent } from "../assets/public/cart.tsx";
import type { CartInitialData } from "../lib/cart.ts";
import { Document } from "../ui/document.tsx";

export function CartPage(handle: Handle<{ initialData: CartInitialData; pathPrefix: string }>) {
  return () => (
    <Document title="Hydrogen | Cart">
      <div class="cart">
        <h1>Cart</h1>
        <CartPageContent
          initialData={handle.props.initialData}
          pathPrefix={handle.props.pathPrefix}
        />
      </div>
    </Document>
  );
}
