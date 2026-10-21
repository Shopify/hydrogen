import { gql, type StorefrontApi } from "@shopify/hydrogen";
import type { Handle } from "remix/component";

import { ProductView } from "../../assets/public/analytics-events.tsx";
import { ProductDetails } from "../../assets/public/product-details.tsx";
import { localizePath } from "../../lib/public/i18n.ts";
import { Document } from "../../ui/document.tsx";

const PRODUCT_VARIANT_FRAGMENT = gql(`
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
`);

const PRODUCT_FRAGMENT = gql(
  `
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    requiresSellingPlan
    encodedVariantExistence
    encodedVariantAvailability
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
    selectedOrFirstAvailableVariant(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      ...ProductVariant
    }
    adjacentVariants(selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
`,
  [PRODUCT_VARIANT_FRAGMENT],
);

export const PRODUCT_QUERY = gql(
  `
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
`,
  [PRODUCT_FRAGMENT],
);

export type ProductData = NonNullable<StorefrontApi.ResultOf<typeof PRODUCT_QUERY>["product"]>;

export function ProductPage(
  handle: Handle<{ product: ProductData; pathPrefix: string; search: string }>,
) {
  return () => {
    const { pathPrefix, product, search } = handle.props;
    const variant = product.selectedOrFirstAvailableVariant;

    return (
      <Document
        title={`Hydrogen | ${product.seo.title ?? product.title}`}
        description={product.seo.description ?? product.description}
        canonicalPath={localizePath(`/products/${product.handle}`, pathPrefix)}
      >
        <ProductDetails product={product} pathPrefix={pathPrefix} search={search} />
        {variant ? (
          <ProductView
            product={{
              id: product.id,
              title: product.title,
              price: variant.price,
              vendor: product.vendor,
              variantId: variant.id,
              variantTitle: variant.title,
              quantity: 1,
            }}
          />
        ) : null}
      </Document>
    );
  };
}
