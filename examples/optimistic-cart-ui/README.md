# Hydrogen example: Optimistic Cart UI

This folder contains an example implementation of [pending optimistic](https://remix.run/docs/en/main/discussion/pending-ui) Cart UI leveraging Hydrogen's [OptimisticInput](https://shopify.dev/docs/api/hydrogen/latest/components/optimisticinput)
component and [useOptimisticData](https://shopify.dev/docs/api/hydrogen/latest/hooks/useoptimisticdata) hook.

More specifically, this example focuses on how to optimistically remove a cart
line item from the cart.

> [!NOTE]
> Removing items without optimistic UI

![not-optimistic](https://github.com/Shopify/hydrogen/assets/12080141/52309d79-12a0-4c38-b172-031e5ca4f8a9)

> [!NOTE]
> Removing items _with_ optimistic UI

![optimistic](https://github.com/Shopify/hydrogen/assets/12080141/29d0b9b2-88b7-44de-ae44-d09863bc2c6f)

## Requirements

- Basic understanding of Remix's [pending optimistic UI](https://remix.run/docs/en/main/discussion/pending-ui)

## Key files

This folder contains the minimal set of files needed to showcase the implementation.
Files that aren’t included by default with Hydrogen and that you’ll need to
create are labeled with 🆕.

| File                                                 | Description                               |
| ---------------------------------------------------- | ----------------------------------------- |
| [`app/components/Cart.tsx`](app/components/Cart.tsx) | Cart component that renders the side cart |

## Instructions

### 1. Link your store to inject the required environment variables

```bash
h2 link
```

### 2. Edit the Cart component file to remove line items optimistically

In `app/components/Cart.tsx`, import the `OptimisticInput` and `useOptimisticData` helpers from @shopify/hydrogen

```ts
import {OptimisticInput, useOptimisticData} from '@shopify/hydrogen';
```

Add the `<OptimisticInput/>` component to the line remove `<CartForm />` in order to trigger a line item removing action

```diff
function CartLineRemoveButton({lineIds}: {lineIds: string[]}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
+     <OptimisticInput id={lineIds[0]} data={{action: 'removing'}} />
      <button type="submit">Remove</button>
    </CartForm>
  );
}
```

Read pending optimistic events adding the `useOptimisticData` hook to the `<CartLineItem >` component.

```diff
function CartLineItem({
  layout,
  line,
}: {
  layout: CartMainProps['layout'];
  line: CartLine;
}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);

+ const optimistic = useOptimisticData<{ action?: 'removing'; quantity?: number;}>(id);

  return (
    <li key={id} className="cart-line">
      {image && (
        <Image
          alt={title}
          data={image}
          height={60}
          width={100}
          loading="lazy"
        />
      )}

       // ...other code
    </li>
  );
}
```

Optimistically hide the line item when the user clicks the remove button, by setting the display
style to `none` if a `removing` event is triggered

```diff
function CartLineItem({
  layout,
  line,
}: {
  layout: CartMainProps['layout'];
  line: CartLine;
}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);

  const optimisticData = useOptimisticData<{ action?: 'removing'; quantity?: number;}>(id);

  return (
    <li
      key={id}
      className="cart-line"
+     style={{ display: optimisticData?.action === 'removing' ? 'none' : 'flex'}}
    >
     //... other code
    </li>
  );
}
```

[View the complete component file](app/components/Cart.tsx) to see these updates in context.
