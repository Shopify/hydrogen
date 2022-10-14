import {json, type LoaderArgs, type MetaFunction} from '@remix-run/cloudflare';
import {useLoaderData} from '@remix-run/react';
import type {ProductConnection} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {PageHeader, Section, ProductGrid} from '~/components';
import {getAllProducts} from '~/data';

export async function loader({request, params}: LoaderArgs) {
  const searchParams = new URL(request.url).searchParams;

  const cursor = searchParams.get('cursor') ?? undefined;
  const direction =
    searchParams.get('direction') === 'previous' ? 'previous' : 'next';

  return json({
    products: await getAllProducts({cursor, pageBy: 4, direction, params}),
  });
}

export const meta: MetaFunction = () => {
  return {
    title: 'All Products',
    description: 'All Products',
  };
};

export default function AllProducts() {
  const {products} = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading="All Products" variant="allCollections" />
      <Section>
        <ProductGrid key="products" products={products as ProductConnection} />
      </Section>
    </>
  );
}
