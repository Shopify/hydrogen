import type {LoaderArgs, MetaFunction} from '@remix-run/cloudflare';
import {useLoaderData} from '@remix-run/react';
import type {Collection} from '@shopify/hydrogen-ui-alpha/storefront-api-types';

import {PageHeader, Section, ProductGrid} from '~/components';
import {getAllProducts} from '~/data';

export async function loader({request, params}: LoaderArgs) {
  const cursor = new URL(request.url).searchParams.get('cursor') ?? undefined;
  const products = await getAllProducts({cursor, params});

  return products;
}

export const meta: MetaFunction = () => {
  return {
    title: 'All Products',
    description: 'All Products',
  };
};

export default function AllProducts() {
  const products = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading="All Products" variant="allCollections" />
      <Section>
        <ProductGrid
          key="products"
          url="/products"
          collection={{products} as Collection}
        />
      </Section>
    </>
  );
}
