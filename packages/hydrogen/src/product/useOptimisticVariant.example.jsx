import {useLoaderData} from '@react-router';
import {useOptimisticVariant} from '@shopify/hydrogen';

export async function loader({context}) {
  return {
    product: await context.storefront.query('/** product query **/'),
    // Note that variants does not need to be awaited to be used by `useOptimisticVariant`
    variants: context.storefront.query('/** variants query **/'),
  };
}

function Product() {
  const {product, variants} = useLoaderData();

  // The selectedVariant optimistically changes during page
  // transitions with one of the preloaded product variants
  const selectedVariant = useOptimisticVariant(
    product.selectedVariant,
    variants,
  );

  // @ts-ignore
  return <ProductMain selectedVariant={selectedVariant} />;
}
