import {defer, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData, Form} from '@remix-run/react';
import type {
  ProductVariant,
  Product as ProductType,
} from '@shopify/hydrogen/storefront-api-types';

export async function loader({params, context}: LoaderArgs) {
  const {productHandle} = params;

  const {product} = await context.storefront.query<{
    product: ProductType & {selectedVariant?: ProductVariant};
  }>(PRODUCT_QUERY, {
    variables: {
      handle: productHandle,
      country: context.storefront.i18n?.country,
      language: context.storefront.i18n?.language,
    },
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  return defer({
    product,
  });
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();
  const {title, vendor, descriptionHtml} = product;

  console.log(product);

  return (
    <>
      <h1>{title}</h1>
      <h2>{vendor}</h2>
      <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
      <Form action="/cart" method="post">
        <input type="hidden" name="cartAction" value="ADD_TO_CART" />
        <input type="hidden" name="lines" value={product.id} />
        <input
          type="hidden"
          name="variantId"
          value={product.selectedVariant?.id}
        />
        <input type="hidden" name="quantity" value="1" />
        <button type="submit">Add to cart</button>
      </Form>
    </>
  );
}

const PRODUCT_QUERY = `#graphql

  query Product(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      descriptionHtml
      vendor
      variants(first: 10) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
          }
        }
      }
    }
  }
`;
