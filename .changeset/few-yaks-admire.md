---
'@shopify/hydrogen-react': patch
---

Add the raw product returned from the Storefront API to also return from `useProduct()`:

```ts
function SomeComponent() {
  const {product} = useProduct();

  return (
    <div>
      <h2>{product.title}</h2>
      <h3>{product.description}</h3>
    </div>
  );
}
```
