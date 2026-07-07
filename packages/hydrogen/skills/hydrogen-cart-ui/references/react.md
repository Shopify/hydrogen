# React Cart Bindings

For React apps, derive cart bindings once from the cart server handlers. Do not hand-roll `useState` cart state, custom mutation fetchers, or bespoke optimistic reducers unless the app is not using React.

```tsx
import { createCartComponents } from "@shopify/hydrogen/react";
```

## Root Setup

Wrap the app in `<CartProvider>`. Keep cart server handlers in a server-only module, separate from React bindings. If the framework can fetch the cart on the server, pass `initialData` so the cart renders correctly on first paint. Use the request-scoped private `storefrontClient` created by the request setup. In React Router, the usual shape is:

```tsx
// app/lib/cart-handlers.ts
import { createCartServerHandlers } from "@shopify/hydrogen";

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
  const cartData = cartHandlers.get({ storefrontClient }).then(({ data }) => data);

  return { cartData };
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <CartProvider initialData={loaderData.cartData}>
      <Outlet />
    </CartProvider>
  );
}
```

Pass the full handler data envelope (`{cart, errors?}`) to `initialData`. Do not unwrap to `data.cart`: `{cart: null}` tells the client the server already checked and found no usable cart, while omitted `initialData` tells the client to fetch `/api/cart` after hydration. The cart server handlers log returned cart errors on the server, so do not throw just to force a route error.

If there is no server cart fetch yet, still wrap with `<CartProvider>`; it will fetch `/api/cart` after hydration. Register the `cartHandlers` from the server-only module in the app's central `handleShopifyRoutes` wiring; use the `hydrogen-request-handlers` skill for the full framework-specific setup.

## Custom Cart Fields

If the cart needs extra fields, pass `fragment` with a fragment named `CartFragment` to `createCartServerHandlers()` and derive typed React bindings from the handlers:

```tsx
// app/lib/cart-handlers.ts
import { createCartServerHandlers, gql } from "@shopify/hydrogen";

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
      {lines.map((line) => {
        const merchandise = line.merchandise;
        const selectedOptions = merchandise?.selectedOptions ?? [];

        return (
          <li key={line.id}>
            {merchandise?.image ? (
              <img src={merchandise.image.url} alt={merchandise.image.altText ?? ""} />
            ) : null}
            {merchandise?.product.handle ? (
              <a href={`/products/${merchandise.product.handle}`}>
                {merchandise.product.title}
              </a>
            ) : (
              <span>{merchandise?.product.title ?? merchandise?.title ?? "Product"}</span>
            )}
            {selectedOptions.map((option) => (
              <span key={option.name}>
                {option.name}: {option.value}
              </span>
            ))}
            {merchandise?.availableForSale === false ? <span>Unavailable</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
```

Cart line merchandise fields are intentionally tolerant because optimistic lines and custom fragments can differ from a complete Storefront API cart response. Treat `line.merchandise`, `merchandise.selectedOptions`, `merchandise.title`, `merchandise.product.handle`, and `merchandise.image` as optional unless the app's custom cart fragment and types prove otherwise.

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

Use `useCartForm()` for existing cart forms: line quantity changes, line removal, discount codes, and order notes. It returns `formProps()` and `register()` helpers that encode Hydrogen's cart action contract.

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
- `register("discountCode", { defaultValue: "" })`, `register("discountCode", { value: code })`, `register("discount-apply")`, and `register("discount-remove")` create discount forms.
- `register("note")` and `register("note-update")` create note forms.

Each line item still gets its own form; the binding removes boilerplate, not the form identity requirement.

For product add-to-cart forms, use `formProps()` and `register()` from `useProductForm()` in the `hydrogen-variant-form` skill. The two helpers share names but encode different form contracts.

If you render the same line items in a cart drawer, share this line item form component with the `/cart` page when possible. If the drawer needs different markup, preserve the same `set` + `lineId` + interactive `quantity` contract.

When wiring less common cart forms, prefer the exact package types over memory. In an installed app, inspect `node_modules/@shopify/hydrogen/dist/index.d.mts` or use editor hover on `CartFormRegister` to confirm which `register(...)` calls require `{ value }` versus `{ defaultValue }`.
