import {
  json,
  type MetaFunction,
  type SerializeFrom,
  type LoaderArgs,
} from '@remix-run/cloudflare';
import {useLoaderData} from '@remix-run/react';
import type {Collection as CollectionType} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import invariant from 'tiny-invariant';

import {PageHeader, Section, Text} from '~/components';
import {ProductGrid} from '~/components/ProductGrid';
import {getCollection} from '~/data';

export async function loader({params, request}: LoaderArgs) {
  const {collectionHandle} = params;

  invariant(collectionHandle, 'Missing collectionHandle param');

  const cursor = new URL(request.url).searchParams.get('cursor') ?? undefined;
  const collection = await getCollection({
    handle: collectionHandle,
    cursor,
    params,
  });

  return json({collection});
}

export const meta: MetaFunction = ({
  data,
}: {
  data: SerializeFrom<typeof loader> | undefined;
}) => {
  return {
    title: data?.collection.seo.title ?? 'Collection',
    description: data?.collection.seo.description,
  };
};

export default function Collection() {
  const {collection} = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading={collection.title}>
        {collection.description && (
          <div className="flex items-baseline justify-between w-full">
            <div>
              <Text format width="narrow" as="p" className="inline-block">
                {collection.description}
              </Text>
            </div>
          </div>
        )}
      </PageHeader>
      <Section>
        <ProductGrid
          key={collection.id}
          collection={collection as CollectionType}
          url={`/collections/${collection.handle}`}
        />
      </Section>
    </>
  );
}
