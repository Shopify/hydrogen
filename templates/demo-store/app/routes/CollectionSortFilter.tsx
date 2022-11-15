import type {LoaderArgs, MetaFunction} from '@shopify/hydrogen-remix';
import {defer} from '@shopify/hydrogen-remix';
import {
  useLoaderData,
  useFetchers,
  useMatches,
  useLocation,
  Link,
} from '@remix-run/react';
import {flattenConnection} from '@shopify/hydrogen-react';
import type {
  Collection,
  CollectionConnection,
  ProductConnection,
  ProductSortKeys,
} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';
import {PRODUCT_CARD_FRAGMENT} from '~/data';

import {PageHeader, Section, ProductGrid} from '~/components';
import type {Collection as CollectionType} from '@shopify/hydrogen-react/storefront-api-types';

import {getLocalizationFromLang} from '~/lib/utils';

const SORT_BY_OPTIONS = [
  {
    label: 'Latest',
    value: 'latest-desc',
  },
  {
    label: 'Lowest price',
    value: 'price-asc',
  },
  {
    label: 'Highest price',
    value: 'price-desc',
  },
];

export async function loader({
  request,
  params,
  context: {storefront},
}: LoaderArgs) {
  const cursor = new URL(request.url).searchParams.get('cursor') ?? undefined;
  const {language, country} = getLocalizationFromLang(params.lang);
  const url = new URL(request.url);
  const collection = url.searchParams.get('collection') || undefined;
  const sort = url.searchParams.get('sort') || undefined;
  let sortVariables:
    | {sortKey: ProductSortKeys; reverse: boolean}
    | Record<string, unknown> = {};

  switch (sort) {
    case 'price-asc':
      sortVariables = {
        sortKey: 'PRICE',
        reverse: false,
      };
      break;
    case 'price-desc':
      sortVariables = {
        sortKey: 'PRICE',
        reverse: true,
      };
      break;
    case 'latest-desc':
      sortVariables = {
        // For some reason these are different:
        // - https://shopify.dev/api/storefront/2022-10/enums/ProductCollectionSortKeys#value-created
        // - https://shopify.dev/api/storefront/2022-10/enums/ProductSortKeys#value-createdat
        sortKey: collection ? 'CREATED' : 'CREATED_AT',
        reverse: true,
      };
      break;
  }

  const variables = {
    ...sortVariables,
    pageBy: 48,
    cursor,
    language,
    country,
    collection,
  };

  let products;

  const options = await storefront.query({
    query: `query Facets {
      collectionByHandle(handle: "freeride") {
        handle
        products(first: 10) {
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
        }
      }
    }`,
  });

  console.log(options.collectionByHandle?.products?.filters);

  if (collection) {
    const data = await storefront.query<{
      collections: CollectionConnection;
    }>({
      query: ALL_PRODUCTS_IN_COLLECTION_QUERY,
      variables,
    });

    invariant(data, 'No data returned from Shopify API');

    products = data.collections.edges[0]?.node.products;
  } else {
    const data = await storefront.query<{
      products: ProductConnection;
    }>({
      query: ALL_PRODUCTS_QUERY,
      variables,
    });

    invariant(data, 'No data returned from Shopify API');

    products = data.products;
  }

  const collections = await storefront.query<{
    collections: CollectionConnection;
  }>({
    query: ALL_COLLECTIONS_QUERY,
    variables: {
      count: 250,
    },
  });

  return defer({
    products,
    collections: flattenConnection(collections.collections),
    collection,
    sort,
  });
}

export function CollectionSortFilterForm() {
  return <>CollectionSortFilterForm</>;
}

export function Collection({children}: {children: any}) {
  return <>{children}</>;
}

const ALL_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query AllProducts(
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $cursor: String
    $sortKey: ProductSortKeys = RELEVANCE
    $reverse: Boolean = false
  ) @inContext(country: $country, language: $language) {
    products(
      first: $pageBy,
      after: $cursor,
      sortKey: $sortKey,
      reverse: $reverse
    ) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`;

const ALL_PRODUCTS_IN_COLLECTION_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query getProductsFromCollection(
    $collection: String
    $first: Int = 20
    $sortKey: ProductCollectionSortKeys = RELEVANCE
    $reverse: Boolean = false
    $cursor: String
  ) {
    collections(first: 1, query: $collection) {
      edges {
        node {
          handle
          products(
            first: $first
            sortKey: $sortKey
            reverse: $reverse
            after: $cursor
          ) {
            nodes {
              ...ProductCard
            }
          }
        }
      }
    }
  }
  `;

const ALL_COLLECTIONS_QUERY = `#graphql
  query getSiteCollections($count: Int!) {
    collections(first: $count) {
      edges {
        node {
          title
          handle
        }
      }
    }
  }
`;

// function SortAndFilter({
//   isOpen,
//   onClose,
//   collection,
//   collections = [],
//   sort,
//   sortByOptions = [],
// }: {
//   isOpen: boolean;
//   onClose: () => void;
//   collections: Partial<Pick<Collection, 'handle' | 'title'>>[];
//   sortByOptions?: {label: string; value: string}[];
//   collection?: string;
//   sort?: string;
// }) {
//   const location = useLocation();

//   return (
//     <Drawer
//       open={isOpen}
//       onClose={onClose}
//       heading="Sort and filter"
//       openFrom="right"
//     >
//       <div>
//         <nav className="py-8 px-8 md:px-12 ">
//           <Heading as="h4" size="copy" className="pb-2">
//             Collection
//           </Heading>
//           <ul className="pb-8">
//             {collections.map((collect) => (
//               <li
//                 key={collect.handle}
//                 className={collect.handle === collection ? 'underline' : ''}
//               >
//                 <Link
//                   aria-selected={collect.handle !== collection}
//                   className="focus:underline hover:underline whitespace-nowrap py-2"
//                   prefetch="intent"
//                   onClick={onClose}
//                   reloadDocument
//                   to={(() => {
//                     const params = new URLSearchParams(location.search);
//                     params.set('collection', collect.handle!);
//                     return location.pathname + '?' + params.toString();
//                   })()}
//                 >
//                   {collect.title}
//                 </Link>
//               </li>
//             ))}
//           </ul>

//           <Heading as="h4" size="copy" className="pb-2">
//             Sort by
//           </Heading>
//           <ul className="pb-8">
//             {sortByOptions.map((sortBy) => (
//               <li
//                 key={sortBy.value}
//                 className={sortBy.value === sort ? 'underline' : ''}
//               >
//                 <Link
//                   aria-selected={sortBy.value !== sort}
//                   className="focus:underline hover:underline whitespace-nowrap"
//                   prefetch="intent"
//                   onClick={onClose}
//                   reloadDocument
//                   to={(() => {
//                     const params = new URLSearchParams(location.search);
//                     params.set('sort', sortBy.value);
//                     return location.pathname + '?' + params.toString();
//                   })()}
//                 >
//                   {sortBy.label}
//                 </Link>
//               </li>
//             ))}
//           </ul>
//         </nav>
//       </div>
//     </Drawer>
//   );
// }
