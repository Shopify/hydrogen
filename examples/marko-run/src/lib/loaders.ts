import type { Context } from "@marko/run";
import { HEADER_COLLECTIONS_QUERY, normalizeHeaderCollections } from "@shared/header";
import {
  getSelectedProductOptions,
  gql,
  parseCollectionParams,
  type ProductFilter,
} from "@shopify/hydrogen";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";

import { getStorefrontClient } from "./storefront";

export const HOME_QUERY = gql(`
  query MarkoHome {
    products(first: 3) {
      nodes {
        handle
        title
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`);

export const COLLECTIONS_QUERY = gql(`
  query MarkoCollections {
    collections(first: 12) {
      nodes {
        handle
        title
        image {
          url
          altText
        }
      }
    }
  }
`);

export const COLLECTION_QUERY = gql(`
  query MarkoCollection(
    $handle: String!
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
  ) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(first: 24, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
        nodes {
          handle
          title
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
        filters {
          id
          label
          type
          presentation
          values {
            id
            label
            count
            input
          }
        }
      }
    }
  }
`);

const PRODUCT_QUERY = gql(`
  query MarkoProduct($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
    product(handle: $handle) {
      id
      handle
      title
      vendor
      description
      selectedOrFirstAvailableVariant(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) {
        id
        title
        availableForSale
        sku
        price {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 10) {
        nodes {
          url
          altText
        }
      }
      options {
        name
        optionValues {
          name
          firstSelectableVariant {
            id
            product {
              handle
            }
            selectedOptions {
              name
              value
            }
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
    }
    products(first: 4) {
      nodes {
        handle
        title
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`);

export const NEWS_QUERY = gql(`
  query MarkoNews {
    blog(handle: "news") {
      articles(first: 10) {
        nodes {
          handle
          title
          publishedAt
          excerpt
        }
      }
    }
  }
`);

export const ARTICLE_QUERY = gql(`
  query MarkoArticle($handle: String!) {
    blog(handle: "news") {
      articleByHandle(handle: $handle) {
        handle
        title
        publishedAt
        contentHtml
      }
    }
  }
`);

const TAXONOMY_METAFIELD_KEY_SEPARATOR = ".";

type HandleRouteContext = Context & { params: { handle: string } };

export type ProductCardData = {
  handle: string;
  title: string;
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
};

export async function loadHeaderCollections(context: Context) {
  const { data } = await getStorefrontClient(context).graphql(HEADER_COLLECTIONS_QUERY);
  return normalizeHeaderCollections(data?.collections?.nodes);
}

export async function loadHome(context: Context) {
  const { data } = await getStorefrontClient(context).graphql(HOME_QUERY);
  return { products: data?.products?.nodes ?? [] };
}

export async function loadCollections(context: Context) {
  const { data } = await getStorefrontClient(context).graphql(COLLECTIONS_QUERY);
  return { collections: data?.collections?.nodes ?? [] };
}

export async function loadCollection(context: HandleRouteContext) {
  const { handle } = context.params;
  if (!handle) throw new Response("Collection not found", { status: 404 });

  const parsed = parseCollectionParams(context.url.searchParams);
  const { data } = await getStorefrontClient(context).graphql(COLLECTION_QUERY, {
    variables: {
      handle,
      filters: toStorefrontApiFilters(parsed.filters),
      sortKey: parsed.sortKey ?? undefined,
      reverse: parsed.reverse || undefined,
    },
  });

  if (!data?.collection) throw new Response("Collection not found", { status: 404 });

  return {
    collection: data.collection,
    dataSearch: context.url.search,
    parsed,
  };
}

export async function loadProduct(context: HandleRouteContext) {
  const { handle } = context.params;
  if (!handle) throw new Response("Product not found", { status: 404 });

  const { data } = await getStorefrontClient(context).graphql(PRODUCT_QUERY, {
    variables: {
      handle,
      selectedOptions: getSelectedProductOptions(context.url),
    },
  });

  if (!data?.product) throw new Response("Product not found", { status: 404 });

  return {
    product: data.product,
    related: (data.products?.nodes ?? [])
      .filter((product) => product.handle !== data.product?.handle)
      .slice(0, 4),
  };
}

export async function loadNews(context: Context) {
  const { data } = await getStorefrontClient(context).graphql(NEWS_QUERY);
  if (!data?.blog) throw new Response("Blog not found", { status: 404 });
  return { articles: data.blog.articles.nodes };
}

export async function loadArticle(context: HandleRouteContext) {
  const { handle } = context.params;
  if (!handle) throw new Response("Article not found", { status: 404 });

  const { data } = await getStorefrontClient(context).graphql(ARTICLE_QUERY, {
    variables: { handle },
  });
  const article = data?.blog?.articleByHandle;
  if (!article) throw new Response("Article not found", { status: 404 });
  return { article };
}

function toStorefrontApiFilters(
  filters: ProductFilter[],
): StorefrontApiProductFilter[] | undefined {
  const storefrontFilters = filters.flatMap(toStorefrontApiFilter);
  return storefrontFilters.length > 0 ? storefrontFilters : undefined;
}

function toStorefrontApiFilter(filter: ProductFilter): StorefrontApiProductFilter[] {
  const storefrontFilters: StorefrontApiProductFilter[] = [];

  if (filter.available != null) storefrontFilters.push({ available: filter.available });
  if (filter.category) storefrontFilters.push({ category: filter.category });
  if (filter.price) storefrontFilters.push({ price: filter.price });
  if (filter.productType != null) storefrontFilters.push({ productType: filter.productType });
  if (filter.productVendor != null) storefrontFilters.push({ productVendor: filter.productVendor });
  if (filter.tag != null) storefrontFilters.push({ tag: filter.tag });
  if (filter.productMetafield?.value != null) {
    const { namespace, key, value } = filter.productMetafield;
    storefrontFilters.push({ productMetafield: { namespace, key, value } });
  }
  if (filter.variantMetafield?.value != null) {
    const { namespace, key, value } = filter.variantMetafield;
    storefrontFilters.push({ variantMetafield: { namespace, key, value } });
  }
  if (filter.variantOption?.value != null) {
    const { name, value } = filter.variantOption;
    storefrontFilters.push({ variantOption: { name, value } });
  }

  const taxonomyMetafield = toStorefrontApiTaxonomyMetafield(filter);
  if (taxonomyMetafield) storefrontFilters.push({ taxonomyMetafield });

  return storefrontFilters;
}

function toStorefrontApiTaxonomyMetafield(filter: ProductFilter) {
  if (!filter.taxonomyMetafield) return null;

  const { key: fullKey, value } = filter.taxonomyMetafield;
  const separatorIndex = fullKey.indexOf(TAXONOMY_METAFIELD_KEY_SEPARATOR);
  if (separatorIndex < 0) return null;

  const namespace = fullKey.slice(0, separatorIndex);
  const key = fullKey.slice(separatorIndex + TAXONOMY_METAFIELD_KEY_SEPARATOR.length);
  if (!namespace || !key) return null;

  return { namespace, key, value };
}
