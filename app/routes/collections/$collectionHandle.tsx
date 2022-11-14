import {
  json,
  type MetaFunction,
  type SerializeFrom,
  type LoaderArgs,
} from '@shopify/hydrogen-remix';
import {useLoaderData} from '@remix-run/react';
import type {Collection as CollectionType} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';
import {PageHeader, Section, Text} from '~/components';
import {ProductGrid} from '~/components/ProductGrid';
import {getLocalizationFromLang} from '~/lib/utils';
import type {Collection} from '@shopify/hydrogen-react/storefront-api-types';
import {PRODUCT_CARD_FRAGMENT} from '~/data';

const PAGINATION_SIZE = 48;

export async function loader({
  params,
  request,
  context: {storefront},
}: LoaderArgs) {
  const {collectionHandle} = params;

  invariant(collectionHandle, 'Missing collectionHandle param');

  const cursor = new URL(request.url).searchParams.get('cursor') ?? undefined;
  const {language, country} = getLocalizationFromLang(params.lang);

  const {collection} = await storefront.query<{
    collection: Collection;
  }>({
    query: COLLECTION_QUERY,
    variables: {
      handle: collectionHandle,
      pageBy: PAGINATION_SIZE,
      cursor,
      language,
      country,
    },
  });

  if (!collection) {
    throw new Response('Not found', {status: 404});
  }

  return json({collection});
}

export const meta: MetaFunction = ({
  data,
}: {
  data: SerializeFrom<typeof loader> | undefined;
}) => {
  return {
    title: data?.collection.seo?.title ?? 'Collection',
    description: data?.collection.seo?.description,
  };
};

export default function Collection() {
  const {collection} = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading={collection.title}>
        {collection?.description && (
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

const COLLECTION_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionDetails(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $cursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      seo {
        description
        title
      }
      image {
        id
        url
        width
        height
        altText
      }
      products(first: $pageBy, after: $cursor) {
        nodes {
          ...ProductCard
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;
