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

`ShopPayButton` is a client-only component because it reads `window.location.origin` after mount and loads Shop JS. In Next.js, put it in a `"use client"` component.

Hydrogen reserves space around the custom element while it hydrates. Use wrapper `style` only when it needs a different reservation; do not pass `height`.

Use `loadScript={false}` only when the app already loads the Shop Pay loader globally.
