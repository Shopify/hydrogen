import type {StorefrontApiClient} from '@shopify/storefront-api-client';
import type {Route} from './+types/_index';
import {getSelectedProductOptions} from '~/lib/from-hydrogen';
import type {SelectedOptionInput} from '~/graphql-types/storefront.types';

export async function loader({context, params, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const {handle} = params;

  if (!handle) {
    throw new Response(null, {status: 404});
  }
  const selectedOptions = getSelectedProductOptions(request);
  console.log('selectedOptions', selectedOptions);

  const product = await getProduct(storefront, handle, selectedOptions);
  console.log('product', product);

  if (!product?.data?.product?.id) {
    throw new Response(null, {status: 404});
  }

  return {
    product: product.data.product,
  };
}

export default function Product({loaderData}: Route.ComponentProps) {
  const product = (loaderData as any).product;

  return (
    <div className="product">
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <div>{product.selectedOrFirstAvailableVariant.title}</div>
      <img
        src={product.featuredImage.url}
        alt={product.featuredImage.altText}
      />
    </div>
  );
}

async function getProduct(
  storefront: StorefrontApiClient,
  handle: string,
  selectedOptions: SelectedOptionInput[],
) {
  return await storefront.request(PRODUCT_QUERY, {
    variables: {handle, selectedOptions},
  });
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    featuredImage {
      id
      url
      altText
    }
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;
