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
      <form {...formProps({ afterSubmit: openCartDrawer })}>
        <input type="hidden" {...register("merchandiseId", {})} />
        <input {...register("quantity", { value: quantity })} />
        <button type="submit" disabled={!addable || pending}>Add to cart</button>
      </form>

      {selectedVariant ? (
        <ShopPayButton
          variants={[{ id: selectedVariant.id, quantity }]}
          channel="hydrogen"
          disabled={!addable || pending}
          width="100%"
          height="48px"
          borderRadius="9999px"
        />
      ) : null}
    </>
  );
}
```

`ShopPayButton` is a client-only component because it reads `window.location.origin` after mount and loads Shop JS. In Next.js, put it in a `"use client"` component.

Use `loadScript={false}` only when the app already loads the Shop Pay loader globally.
