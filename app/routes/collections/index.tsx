import {json, LoaderArgs, type MetaFunction} from '@remix-run/cloudflare';
import {useLoaderData} from '@remix-run/react';
import type {CollectionConnection} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {PageHeader, Section} from '~/components';
import {CollectionGrid} from '~/components/CollectionGrid';
import {getCollections} from '~/data';

export const loader = async ({request, params}: LoaderArgs) => {
  const searchParams = new URL(request.url).searchParams;

  const cursor = searchParams.get('cursor') ?? undefined;
  const direction =
    searchParams.get('direction') === 'previous' ? 'previous' : 'next';

  const collections = await getCollections({
    cursor,
    pageBy: 2,
    direction,
    params,
  });

  return json({collections});
};

export const meta: MetaFunction = () => {
  return {
    title: 'All Collections',
  };
};

export default function Collections() {
  const {collections} = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading="Collections" />
      <Section>
        <CollectionGrid collections={collections as CollectionConnection} />
      </Section>
    </>
  );
}
