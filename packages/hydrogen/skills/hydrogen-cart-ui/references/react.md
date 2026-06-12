# React Cart Bindings

For React apps, derive cart bindings once from the cart server handlers. Do not hand-roll `useState` cart state, custom mutation fetchers, or bespoke optimistic reducers unless the app is not using React.

```tsx
import { createCartComponents } from "@shopify/hydrogen/react";
```

## Root Setup

Wrap the app in `<CartProvider>`. Keep cart server handlers in a server-only module, separate from React bindings. If the framework can fetch the cart on the server, pass `initialData` so the cart renders correctly on first paint. Use the request-scoped private `storefrontClient` created by the request setup. In React Router, the usual shape is:

```tsx
// app/lib/cart-handlers.ts
import { createCartServerHandlers } from "@shopify/hydrogen/cart";

export const cartHandlers = createCartServerHandlers();
```

```tsx
// app/lib/cart.ts
import { createCartComponents } from "@shopify/hydrogen/react";

import type { cartHandlers } from "./cart-handlers";

export const { CartProvider, useCart, useCartForm } = createCartComponents<typeof cartHandlers>();
```

```tsx
// app/root.tsx
import { storefrontClientContext } from "~/lib/storefront";
import { CartProvider } from "~/lib/cart";
import { cartHandlers } from "~/lib/cart-handlers";

export async function loader({ context }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const { data } = await cartHandlers.get({ storefrontClient });
  return { cart: data.cart };
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <CartProvider initialData={loaderData.cart}>
      <Outlet />
    </CartProvider>
  );
}
```

If there is no server cart fetch yet, still wrap with `<CartProvider>`; it will fetch `/api/cart` after hydration. Register the `cartHandlers` from the server-only module with `handleShopifyRoutes({ handlers: [cartHandlers] })` so that route exists.

## Custom Cart Fields

If the cart needs extra fields, pass `fragment` with a fragment named `CartFragment` to `createCartServerHandlers()` and derive typed React bindings from the handlers:

```tsx
// app/lib/cart-handlers.ts
import { gql } from "@shopify/hydrogen";
import { createCartServerHandlers } from "@shopify/hydrogen/cart";

const cartFragment = gql(`
  fragment CartFragment on Cart {
    lines(first: 250) {
      nodes {
        merchandise {
          ... on ProductVariant {
            availableForSale
          }
        }
      }
    }
  }
`);

export const cartHandlers = createCartServerHandlers({
  fragment: cartFragment,
});
```

```tsx
// app/lib/cart.ts
import { createCartComponents } from "@shopify/hydrogen/react";

import type { cartHandlers } from "./cart-handlers";

export const { CartProvider, useCart, useCartForm } =
  createCartComponents<typeof cartHandlers>();

function CartLines() {
  const lines = useCart((state) => state.data.lines.nodes);

  return (
    <ul>
      {lines.map((line) => (
        <li key={line.id}>
          <span>{line.merchandise?.product.title}</span>
          {line.merchandise?.availableForSale === false ? <span>Unavailable</span> : null}
        </li>
      ))}
    </ul>
  );
}
```

## Reading Cart State

Use `useCart(selector)` for reactive state. Select only what the component needs:

```tsx
const totalQuantity = useCart((state) => state.data.totalQuantity);
const lines = useCart((state) => state.data.lines.nodes);
const pendingLines = useCart((state) => state.pending.lines);
const lineErrors = useCart((state) => state.errors.lines);
```

Use this for the navbar cart count, cart line list, totals, pending state, and scoped errors. Do not mirror selected cart state into React state; the store already publishes updates.

## Mutating Cart State

Use `useCartForm()` for forms. It returns `formProps()` and `register()` helpers that encode Hydrogen's cart action contract.

Line item quantity forms must keep this shape even when the surrounding markup, styling, or component boundaries differ:

```tsx
function LineItemQuantity({ line }: { line: { id: string; quantity: number } }) {
  const { formProps, register } = useCartForm();
  const pendingLines = useCart((state) => state.pending.lines);

  return (
    <form {...formProps()}>
      <button {...register("set")} />
      <input type="hidden" {...register("lineId", { value: line.id })} />
      <button type="submit" {...register("decrease")}>
        -
      </button>
      <input
        {...register("quantity", { value: line.quantity, interactive: true })}
        className={pendingLines.has(line.id) ? "opacity-30" : ""}
      />
      <button type="submit" {...register("increase")}>
        +
      </button>
      <button type="submit" {...register("remove")}>
        Remove
      </button>
    </form>
  );
}
```

Important React form fields:

- `formProps()` wires `method`, `action`, and submit handling to the cart store.
- `register("set")` renders the hidden default submit control for explicit line quantity updates. Keep it in every line item quantity form so pressing Enter in the quantity input submits the set action.
- `register("lineId", { value })` scopes the form to one line.
- `register("quantity", { value, interactive: true })` wires an editable quantity input for both hydrated and no-JS submissions. Do not replace it with a text-only `<span>`.
- `register("increase")`, `register("decrease")`, and `register("remove")` create line item controls.
- `register("discountCode")`, `register("discount-apply")`, and `register("discount-remove")` create discount forms.
- `register("note")` and `register("note-update")` create note forms.

Each line item still gets its own form; the binding removes boilerplate, not the form identity requirement.

If you render the same line items in a cart drawer, share this line item form component with the `/cart` page when possible. If the drawer needs different markup, preserve the same `set` + `lineId` + interactive `quantity` contract.
