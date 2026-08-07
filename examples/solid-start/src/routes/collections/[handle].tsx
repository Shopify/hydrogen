import type { ProductFilter } from "@shopify/hydrogen";
import { gql, parseCollectionParams } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";
import { Title } from "@solidjs/meta";
import { createAsync, query, useLocation, useParams, type RouteDefinition } from "@solidjs/router";
import { createEffect, Show } from "solid-js";

import { CollectionBrowser } from "../../components/CollectionBrowser";
import { AnalyticsEvent, getAnalytics } from "../../lib/analytics";
import { getRequestStorefrontClient } from "../../lib/request-storefront";

const COLLECTION_QUERY = gql(`
  query Collection(
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

const TAXONOMY_METAFIELD_KEY_SEPARATOR = ".";

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

const fetchCollection = query(async (handle: string, search: string) => {
  "use server";
  const storefrontClient = getRequestStorefrontClient();
  const parsed = parseCollectionParams(new URLSearchParams(search));
  const { data } = await storefrontClient.graphql(COLLECTION_QUERY, {
    variables: {
      handle,
      filters: toStorefrontApiFilters(parsed.filters),
      sortKey: parsed.sortKey ?? undefined,
      reverse: parsed.reverse || undefined,
    },
  });
  if (!data?.collection) {
    throw new Error(`Collection not found: ${handle}`);
  }
  return {
    dataSearch: search,
    collection: data.collection,
  };
}, "collection");

export const route = {
  preload: ({ params }) => params.handle && fetchCollection(params.handle, ""),
} satisfies RouteDefinition;

export default function Collection() {
  const params = useParams<{ handle: string }>();
  const location = useLocation();
  const data = createAsync(() => fetchCollection(params.handle, location.search));

  createEffect(() => {
    const collection = data()?.collection;
    if (!collection) return;
    getAnalytics()?.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      collection: { id: collection.id, handle: collection.handle },
    });
  });

  return (
    <Show when={data()}>
      {(loaded) => (
        <>
          <Title>{loaded().collection.title} — Mock.shop</Title>
          <CollectionBrowser
            title={loaded().collection.title}
            description={loaded().collection.description}
            handle={loaded().collection.handle}
            dataSearch={loaded().dataSearch}
            products={loaded().collection.products.nodes}
            availableFilters={loaded().collection.products.filters}
          />
        </>
      )}
    </Show>
  );
}
