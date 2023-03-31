import {ProductProvider, useProduct} from '@shopify/hydrogen-react';

export function Product({product}) {
  return (
    <ProductProvider data={product} initialVariantId="some-id">
      <UsingProduct />
    </ProductProvider>
  );
}

function UsingProduct() {
  const {product, variants, setSelectedVariant} = useProduct();
  return (
    <>
      <h1>{product?.title}</h1>
      {variants?.map((variant) => {
        <button onClick={() => setSelectedVariant(variant)} key={variant?.id}>
          {variant?.title}
        </button>;
      })}
      ;
    </>
  );
}
