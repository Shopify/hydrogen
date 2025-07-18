import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, Link} from 'react-router';
import {getPaginationVariables, Pagination} from '@shopify/hydrogen';
import {type Collection} from '@shopify/hydrogen-react/storefront-api-types';

interface Product {
  id: string;
  title: string;
  handle: string;
}

interface CollectionWithProducts extends Omit<Collection, 'products'> {
  products: {
    nodes: Product[];
    pageInfo: {
      hasPreviousPage: boolean;
      hasNextPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
  };
}

interface CollectionQuery {
  collection: CollectionWithProducts;
}

export async function loader({
  request,
  context: {storefront},
}: LoaderFunctionArgs) {
  const womensPaginationVariables = getPaginationVariables(request, {
    pageBy: 2,
    namespace: 'womens', // Specify a unique namespace for the pagination parameters
  });
  const mensPaginationVariables = getPaginationVariables(request, {
    pageBy: 2,
    namespace: 'mens', // Specify a unique namespace for the pagination parameters
  });

  const [womensProducts, mensProducts] = await Promise.all([
    storefront.query(COLLECTION_PRODUCTS_QUERY, {
      variables: {...womensPaginationVariables, handle: 'women'},
    }) as Promise<CollectionQuery>,
    storefront.query(COLLECTION_PRODUCTS_QUERY, {
      variables: {...mensPaginationVariables, handle: 'men'},
    }) as Promise<CollectionQuery>,
  ]);

  return {womensProducts, mensProducts};
}

export default function Collection() {
  const {womensProducts, mensProducts} = useLoaderData<typeof loader>();
  return (
    <div className="collection">
      <h1>Womens</h1>

      <Pagination
        connection={womensProducts?.collection?.products}
        // Specify a unique namespace for the pagination links
        namespace="womens"
      >
        {({nodes, isLoading, PreviousLink, NextLink}) => {
          return (
            <div>
              <PreviousLink>
                {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
              </PreviousLink>
              <div>
                {nodes.map((product) => (
                  <div key={product.id}>
                    <Link to={`/products/${product.handle}`}>
                      {product.title}
                    </Link>
                  </div>
                ))}
              </div>
              <NextLink>
                {isLoading ? 'Loading...' : <span>Load more ↓</span>}
              </NextLink>
            </div>
          );
        }}
      </Pagination>

      <h1>Mens</h1>
      <Pagination
        connection={mensProducts?.collection?.products}
        // Specify a unique namespace for the pagination links
        namespace="mens"
      >
        {({nodes, isLoading, PreviousLink, NextLink}) => {
          return (
            <div>
              <PreviousLink>
                {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
              </PreviousLink>
              <div>
                {nodes.map((product) => (
                  <div key={product.id}>
                    <Link to={`/products/${product.handle}`}>
                      {product.title}
                    </Link>
                  </div>
                ))}
              </div>
              <NextLink>
                {isLoading ? 'Loading...' : <span>Load more ↓</span>}
              </NextLink>
            </div>
          );
        }}
      </Pagination>
    </div>
  );
}

const COLLECTION_PRODUCTS_QUERY = `#graphql
  query CollectionProducts(
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $handle: String!
  ) {
    collection(handle: $handle) {
      products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
        nodes {
          id
          handle
          title
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
` as const;
