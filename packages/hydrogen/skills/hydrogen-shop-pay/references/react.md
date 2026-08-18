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
          disabled={!addable || pending}
          width="100%"
          borderRadius="9999px"
          accessibilityLabel="Shop Payで購入"
        />
      ) : null}
    </>
  );
}
```

`ShopPayButton` server-renders a `<hydrogen-shop-pay-button>` with a declarative
shadow root. The shadow root preserves the branded styles before JavaScript runs
and upgrades client-created instances without hydration errors.

Size with `width`/`borderRadius`. `className` and `style` are intentionally not
supported because page CSS cannot reach the internal anchor. Pass
`accessibilityLabel` when the storefront language is not English. Localize words
around the brand, but never translate `Shop Pay` itself. Pass `nonce` when the
storefront's Content Security Policy requires nonces for inline `<style>`
elements. The nonce does not authorize the `style` attribute used by `width` and
`borderRadius`; strict policies must allow inline style attributes for those
custom dimensions.
