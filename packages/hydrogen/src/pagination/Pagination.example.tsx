import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {Pagination, getPaginationVariables} from '@shopify/hydrogen';
import {useLoaderData, Link} from '@remix-run/react';

export async function loader({request, context: {storefront}}: LoaderArgs) {
  const variables = getPaginationVariables(request, {pageBy: 8});

  const data = await storefront.query(ALL_PRODUCTS_QUERY, {
    variables,
  });

  return json({products: data.products});
}

export default function List() {
  const {products} = useLoaderData<typeof loader>();

  return (
    <Pagination connection={products}>
      {({
        hasNextPage,
        hasPreviousPage,
        nextPageUrl,
        nodes,
        prevPageUrl,
        isLoading,
        state,
      }) => (
        <>
          {hasPreviousPage && (
            <Link to={prevPageUrl} preventScrollReset={true} state={state}>
              {isLoading ? 'Loading' : 'Previous'}
            </Link>
          )}
          <div>
            {nodes.map((product) => (
              <Link key={product.id} to={`/products/${product.handle}`}>
                {product.title}
              </Link>
            ))}
          </div>
          {hasNextPage && (
            <Link to={nextPageUrl} preventScrollReset={true} state={state}>
              {isLoading ? 'Loading' : 'Next'}
            </Link>
          )}
        </>
      )}
    </Pagination>
  );
}

const ALL_PRODUCTS_QUERY = `#graphql
  query AllProducts(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      nodes { id
        title
        handle
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`;
