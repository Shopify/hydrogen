import {useLoaderData} from '@remix-run/react';
import {defer} from '@remix-run/server-runtime';
import {useOptimisticProduct} from '@shopify/hydrogen';

export async function loader({context}) {
  return defer({
    product: await context.storefront.query('/** product query **/'),
    // Note that variants does not need to be awaited to be used by `useOptimisticProduct`
    variants: context.storefront.query('/** variants query **/'),
  });
}

function Product() {
  const {product: originalProduct, variants} = useLoaderData();

  // The product.selectedVariant optimistically changed during a page
  // transition with one of the preloaded product variants
  const product = useOptimisticProduct(originalProduct, variants);

  // @ts-ignore
  return <ProductMain product={product} />;
}
