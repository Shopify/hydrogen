import {defineSection} from '@shopify/hydrogen';

export default defineSection({
  name: 'Kitchen Sink',
  type: 'kitchen_sink',
  fields: [
    {
      name: 'Date Time',
      key: 'date_time',
      type: 'date_time',
    },
    {
      name: 'List Date Time',
      key: 'list_date_time',
      type: 'list.date_time',
    },
    {
      name: 'Date',
      key: 'date',
      type: 'date',
    },
    {
      name: 'List Date',
      key: 'list_date',
      type: 'list.date',
    },
    {
      name: 'Dimension',
      key: 'dimension',
      type: 'dimension',
    },
    {
      name: 'List Dimension',
      key: 'list_dimension',
      type: 'list.dimension',
    },
    {
      name: 'Volume',
      key: 'volume',
      type: 'volume',
    },
    {
      name: 'List Volume',
      key: 'list_volume',
      type: 'list.volume',
    },
    {
      name: 'Weight',
      key: 'weight',
      type: 'weight',
    },
    {
      name: 'List Weight',
      key: 'lists_weight',
      type: 'list.weight',
    },
    {
      name: 'Decimal',
      key: 'decimal',
      type: 'number_decimal',
    },
    {
      name: 'List Decimal',
      key: 'lists_decimal',
      type: 'list.number_decimal',
    },
    {
      name: 'Integer',
      key: 'integer',
      type: 'number_integer',
    },
    {
      name: 'List Integer',
      key: 'lists_integer',
      type: 'list.number_integer',
    },
    // {
    //   name: 'Single Line Text Field',
    //   key: 'single_line_text',
    //   type: 'single_line_text_field',
    // },
    {
      name: 'Multi Line Text Field',
      key: 'multi_line_text',
      type: 'multi_line_text_field',
    },
    {
      name: 'List Single Line Text Field',
      key: 'list_single_line_text',
      type: 'list.single_line_text_field',
    },
    {
      name: 'Rich Text Field',
      key: 'rich_text',
      type: 'rich_text_field',
    },
    {
      name: 'Product',
      key: 'product',
      type: 'product_reference',
    },
    {
      name: 'List Product',
      key: 'list_product',
      type: 'list.product_reference',
    },
    {
      name: 'Collection',
      key: 'collection',
      type: 'collection_reference',
    },
    {
      name: 'List Collection',
      key: 'list_collection',
      type: 'list.collection_reference',
    },
    {
      name: 'Page',
      key: 'page',
      type: 'page_reference',
    },
    {
      name: 'List Page',
      key: 'list_page',
      type: 'list.page_reference',
    },
    {
      name: 'Product Variant',
      key: 'product_variant',
      type: 'variant_reference',
    },
    {
      name: 'List Product Variant',
      key: 'list_product_variant',
      type: 'list.variant_reference',
    },
    {
      name: 'File',
      key: 'file',
      type: 'file_reference',
    },
    {
      name: 'List File',
      key: 'list_file',
      type: 'list.file_reference',
    },
    {
      name: 'Boolean',
      key: 'boolean',
      type: 'boolean',
    },
    {
      name: 'Color',
      key: 'color',
      type: 'color',
    },
    {
      name: 'List Color',
      key: 'list_color',
      type: 'list.color',
    },
    {
      name: 'Rating',
      key: 'rating',
      type: 'rating',
    },
    {
      name: 'List Rating',
      key: 'list_rating',
      type: 'list.rating',
    },
    {
      name: 'Url',
      key: 'url',
      type: 'url',
    },
    {
      name: 'List Url',
      key: 'list_url',
      type: 'list.url',
    },
    {
      name: 'money',
      key: 'money',
      type: 'money',
    },
    {
      name: 'JSON',
      key: 'json',
      type: 'json',
    },
    {
      name: 'Mixed Reference',
      key: 'mixed_reference',
      type: 'mixed_reference',
    },
    {
      name: 'List Mixed Reference',
      key: 'list_mixed_reference',
      type: 'list.mixed_reference',
    },
    {
      name: 'Metaobject',
      key: 'metaobject',
      type: 'metaobject_reference',
    },
    {
      name: 'List Metaobject',
      key: 'list_metaobject',
      type: 'list.metaobject_reference',
    },
  ],
});
export const KITCHE_SINK_QUERY = `#graphql
  query SectionKitcheSink($handle: String!) {
    section: metaobject(handle: { handle: $handle, type: "section_kitche_sink" }) {
      ...KitcheSink
    }
  }
  fragment KitcheSink on Metaobject {
    id
    handle
    type
    name: field(key: "name") { value }
date_time: field(key: "date_time") { value }
list_date_time: field(key: "list_date_time") { value }
date: field(key: "date") { value }
list_date: field(key: "list_date") { value }
dimension: field(key: "dimension") { value }
list_dimension: field(key: "list_dimension") { value }
volume: field(key: "volume") { value }
list_volume: field(key: "list_volume") { value }
weight: field(key: "weight") { value }
lists_weight: field(key: "lists_weight") { value }
decimal: field(key: "decimal") { value }
lists_decimal: field(key: "lists_decimal") { value }
integer: field(key: "integer") { value }
lists_integer: field(key: "lists_integer") { value }
single_line_text: field(key: "single_line_text") { value }
multi_line_text: field(key: "multi_line_text") { value }
list_single_line_text: field(key: "list_single_line_text") { value }
rich_text: field(key: "rich_text") { value }
product: field(key: "product") { reference { ...ProductFragment } }

  }
  #graphql
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
  #graphql
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
export const KITCHEN_SINK_QUERY = `#graphql
  query SectionKitchenSink($handle: String!) {
    section: metaobject(handle: { handle: $handle, type: "section_kitchen_sink" }) {
      ...KitchenSink
    }
  }
  fragment KitchenSink on Metaobject {
    id
    handle
    type
    date_time: field(key: "date_time") { value type }
list_date_time: field(key: "list_date_time") { value type }
date: field(key: "date") { value type }
list_date: field(key: "list_date") { value type }
dimension: field(key: "dimension") { value type }
list_dimension: field(key: "list_dimension") { value type }
volume: field(key: "volume") { value type }
list_volume: field(key: "list_volume") { value type }
weight: field(key: "weight") { value type }
lists_weight: field(key: "lists_weight") { value type }
decimal: field(key: "decimal") { value type }
lists_decimal: field(key: "lists_decimal") { value type }
integer: field(key: "integer") { value type }
lists_integer: field(key: "lists_integer") { value type }
multi_line_text: field(key: "multi_line_text") { value type }
list_single_line_text: field(key: "list_single_line_text") { value type }
rich_text: field(key: "rich_text") { value type }
product: field(key: "product") { type reference { ...ProductFragment } }
list_product: field(key: "list_product") { type references(first: 8) { nodes { ...ProductFragment } } }
collection: field(key: "collection") { type reference { ...CollectionFragment } }
list_collection: field(key: "list_collection") { type references(first: 8) { nodes { ...CollectionFragment } } }
page: field(key: "page") { type reference { ...PageFragment } }
list_page: field(key: "list_page") { type references(first: 8) { nodes { ...PageFragment } } }
product_variant: field(key: "product_variant") { type reference { ...VariantFragment } }
list_product_variant: field(key: "list_product_variant") { type references(first: 8) { nodes { ...VariantFragment } } }
file: field(key: "file") { type reference { ...MediaImageFragment } }
list_file: field(key: "list_file") { type references(first: 8) { nodes { ...MediaImageFragment } } }
boolean: field(key: "boolean") { value type }
color: field(key: "color") { value type }
list_color: field(key: "list_color") { value type }
rating: field(key: "rating") { value type }
list_rating: field(key: "list_rating") { value type }
url: field(key: "url") { value type }
list_url: field(key: "list_url") { value type }
money: field(key: "money") { value type }
json: field(key: "json") { value type }
mixed_reference: field(key: "mixed_reference") { type reference { ...ReferenceFragment } }
mixed_reference: field(key: "mixed_reference") { type references(first: 8) { nodes { ...ReferenceFragment } } }
list_mixed_reference: field(key: "list_mixed_reference") { type references(first: 8) { nodes { ...ReferenceFragment } } }
metaobject: field(key: "metaobject") { type reference { ...MetaobjectFragment } }
list_metaobject: field(key: "list_metaobject") { type references(first: 8) { nodes { ...MetaobjectFragment } } }
    
  }
  #graphql
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

#graphql
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

#graphql
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

#graphql
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

#graphql
  fragment MediaImageFragment on MediaImage {
    __typename
    image {
      altText
      url
      width
      height
    }
  }

#graphql
  fragment GenericFileFragment on GenericFile {
    __typename
    alt
    url
    mimeType
  }

#graphql
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

#graphql
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
