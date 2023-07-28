export const PAGE_FRAGMENT = `#graphql
  fragment PageFragment on Page {
    __typename
    id
    title
    handle
    body
    bodySummary
    createdAt
    updatedAt
    title
    trackingParameters
    seo {
      title
      description
    }
  }
`;

export const VARIANT_FRAGMENT = `#graphql
  fragment VariantFragment on ProductVariant {
    __typename
    title
    selectedOptions {
      value
      name
    }
    price {
      amount
      currencyCode
    }
    image {
      altText
      width
      height
      url
    }
    sku
    availableForSale
  }
`;

export const PRODUCT_FRAGMENT = `#graphql
  fragment ProductFragment on Product {
    __typename
    id
    tags
    title
    handle
    productType
    description
    variants(first: 1) {
      nodes {
        ...VariantFragment
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
  }
`;

export const COLLECTION_FRAGMENT = `#graphql
  fragment CollectionFragment on Collection {
    __typename
    id
    title
    description
    handle
    image {
      altText
      width
      height
      url
    }
  }
`;

export const MEDIA_IMAGE_FRAGMENT = `#graphql
  fragment MediaImageFragment on MediaImage {
    __typename
    image {
      altText
      url
      width
      height
    }
  }
`;

export const METAOBJECT_FRAGMENT = `#graphql
  fragment MetaobjectFragment on Metaobject {
    __typename
    id
    handle
    type
    fields {
      key
      value
    }
  }
`;

export const GENERIC_FILE_FRAGMENT = `#graphql
  fragment GenericFileFragment on GenericFile {
    __typename
    alt
    url
    mimeType
  }
`;

// NOTE: https://shopify.dev/docs/api/storefront/2023-07/unions/MetafieldReference
export const REFERENCE_FRAGMENT = `#graphql
  fragment ReferenceFragment on MetafieldReference {
     ... on MediaImage {
        ...MediaImageFragment
      }
      ... on GenericFile {
        ...GenericFileFragment
      }
      ... on Collection {
        ...CollectionFragment
      }
      ... on Product {
        ...ProductFragment
      }
      ... on Page {
        ...PageFragment
      }
      ... on ProductVariant {
        ...VariantFragment
      }
      ... on Metaobject {
        ...MetaobjectFragment
      }
  }
`;

export const FIELD_REFERENCE_FRAGMENT = `#graphql
  fragment FieldReferenceFragment on MetaobjectField {
    reference {
      ...ReferenceFragment
    }
  }
`;

export const FIELD_REFERENCES_FRAGMENT = `#graphql
  fragment FieldReferencesFragment on MetaobjectField {
    references(first: 4) {
      nodes {
       ...ReferenceFragment
      }
    }
  }
`;

export const BLOCKS_REFERENCES_FRAGMENT = /* gql */ `#graphql
  fragment BlocksReferencesFragment on MetaobjectField {
    references(first: 20) {
      nodes {
        ...ReferenceFragment
      }
    }
  }
`;
