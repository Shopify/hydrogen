import {
  json,
  type MetaFunction,
  type SerializeFrom,
  type LoaderArgs,
} from '@shopify/hydrogen-remix';
import {useLoaderData} from '@remix-run/react';
import type {
  Collection as CollectionType,
  Filter,
} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';
import {PageHeader, Section, Text, SortFilter} from '~/components';
import {ProductGrid} from '~/components/ProductGrid';
import {getLocalizationFromLang} from '~/lib/utils';

import {PRODUCT_CARD_FRAGMENT} from '~/data';

const PAGINATION_SIZE = 48;

export async function loader({
  params,
  request,
  context: {storefront},
}: LoaderArgs) {
  const {collectionHandle} = params;

  invariant(collectionHandle, 'Missing collectionHandle param');

  const searchParams = new URL(request.url).searchParams;
  const knownFilters = ['cursor', 'productVendor', 'productType', 'available'];

  const variantOption: Record<string, string>[] = [];
  const variables: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    // TODO: Add price min/max to query
    if (knownFilters.includes(key)) {
      variables[key] = value;
    } else {
      variantOption.push({name: key, value});
    }
  }

  const {language, country} = getLocalizationFromLang(params.lang);

  const {collection} = await storefront.query<{
    collection: CollectionType;
  }>({
    query: COLLECTION_QUERY,
    variables: {
      ...variables,
      handle: collectionHandle,
      pageBy: PAGINATION_SIZE,
      language,
      country,
      available: variables.available === 'false' ? false : true,
      // TODO: Can we pass in multiple variantOptions?
      variantOption: variantOption.length > 0 ? variantOption[0] : undefined,
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
        <SortFilter filters={collection.products.filters as Filter[]} />
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
    $productVendor: String
    $productType: String
    $available: Boolean
    $variantOption: VariantOptionFilter
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
      products(
        first: $pageBy,
        after: $cursor,
        filters: {
          productVendor: $productVendor,
          productType: $productType,
          available: $available
          variantOption: $variantOption
        }
      ) {
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
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
