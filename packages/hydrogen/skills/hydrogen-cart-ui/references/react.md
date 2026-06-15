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
import { createCartServerHandlers } from "@shopify/hydrogen";

const cartFragment = gql(`
  fragment CartFragment on Cart {
    lines(first: 250) {
      nodes {
        merchandise {
          ... on ProductVariant {
            currentlyNotInStock
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
          {line.merchandise?.currentlyNotInStock ? <span>Backordered</span> : null}
        </li>
      ))}
    </ul>
  );
}
```

## Product Fields That Fit Cart Lines

Product handlers should use the same cart handler value that defines cart line merchandise. This lets TypeScript reject product fragments whose selected variant cannot be used as optimistic cart line merchandise, while preserving extra product fields for product components.

```tsx
// app/lib/product-handlers.ts
import { gql, createProductServerHandlers } from "@shopify/hydrogen";

import { cartHandlers } from "./cart-handlers";

const productFragment = gql(`
  fragment ProductFragment on Product {
    description
    options {
      optionValues {
        firstSelectableVariant {
          currentlyNotInStock
        }
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      currentlyNotInStock
    }
    adjacentVariants(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      currentlyNotInStock
    }
  }
`);

export const productHandlers = createProductServerHandlers({
  cartHandlers,
  fragment: productFragment,
});
```

```tsx
// app/lib/product.ts
import { createProductComponents } from "@shopify/hydrogen/react";

import type { productHandlers } from "./product-handlers";

export const { ProductProvider, useProduct, useProductForm } =
  createProductComponents<typeof productHandlers>();

function ProductDescription() {
  const { selectedVariant } = useProduct();

  return selectedVariant?.currentlyNotInStock ? <p>Backordered</p> : null;
}
```

If a cart fragment adds a custom merchandise field that product forms need for optimistic lines, select that field in every product variant source: `selectedOrFirstAvailableVariant`, `adjacentVariants`, and `options.optionValues.firstSelectableVariant`.

`createProductServerHandlers` takes the `cartHandlers` runtime value rather than `typeof cartHandlers` because TypeScript does not support partial inference after one explicit generic parameter. Product and cart handlers live in server modules that typically import both values anyway, so this keeps inference precise without changing the practical server bundle shape.

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

Use `useCartForm()` for forms. It returns `formProps()` and `register()` helpers that encode Hydrogen's cart action contract:

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
- `register("set")` identifies line quantity updates.
- `register("lineId", { value })` scopes the form to one line.
- `register("quantity", { value, interactive: true })` wires quantity input behavior.
- `register("increase")`, `register("decrease")`, and `register("remove")` create line item controls.
- `register("discountCode")`, `register("discount-apply")`, and `register("discount-remove")` create discount forms.
- `register("note")` and `register("note-update")` create note forms.

Each line item still gets its own form; the binding removes boilerplate, not the form identity requirement.
