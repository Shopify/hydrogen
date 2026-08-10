# React

Import from the React entrypoint:

```tsx
import { ShopPayButton } from "@shopify/hydrogen/react";
```

In a product form:

```tsx
function AddToCart({ product }: { product: ProductData }) {
  const { options, selectedVariant, formProps, register, errors, pending } = useProductForm();
  const [quantity, setQuantity] = useState(1);
  const addable = canAddToCart(product, options);

  return (
    <>
      <form {...formProps({ beforeSubmit: openCartDrawer })}>
        <input type="hidden" {...register("merchandiseId", {})} />
        <input {...register("quantity", { value: quantity })} />
        <button {...register("addToCart", {})} disabled={!addable || pending}>Add to cart</button>
      </form>

      {selectedVariant ? (
        <ShopPayButton
          variants={[{ id: selectedVariant.id, quantity }]}
          channel="hydrogen"
          disabled={!addable || pending}
          width="100%"
          borderRadius="9999px"
        />
      ) : null}
    </>
  );
}
```

`ShopPayButton` renders a plain anchor with no hooks, so it server-renders as a
working button — including in React Server Components — with no `"use client"`
requirement of its own.

Size with `width`/`borderRadius` props; `className` and `style` merge onto the
anchor. Pass `locale` when the storefront language is not English.
