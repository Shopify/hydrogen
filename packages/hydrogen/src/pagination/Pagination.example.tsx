import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {Pagination, getPaginationVariables} from '@shopify/hydrogen';
import {useLoaderData, Link} from '@react-router';
import {ProductConnection} from '@shopify/hydrogen/storefront-api-types';

export async function loader({
  request,
  context: {storefront},
}: LoaderFunctionArgs) {
  const variables = getPaginationVariables(request, {pageBy: 8});

  const data = await storefront.query<{products: ProductConnection}>(
    ALL_PRODUCTS_QUERY,
    {
      variables,
    },
  );

  return {products: data.products};
}

export default function List() {
  const {products} = useLoaderData<typeof loader>();

  return (
    <Pagination connection={products}>
      {({nodes, NextLink, PreviousLink}) => (
        <>
          <PreviousLink>Previous</PreviousLink>
          <div>
            {nodes.map((product) => (
              <Link key={product.id} to={`/products/${product.handle}`}>
                {product.title}
              </Link>
            ))}
          </div>
          <NextLink>Next</NextLink>
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
