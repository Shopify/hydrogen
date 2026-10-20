import { createNuxtWebRequest } from "@shared/nuxt-event";
import type { ProductFilter } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";

const TAXONOMY_METAFIELD_KEY_SEPARATOR = ".";

export function getNuxtRequestSearchParams(
  event: Parameters<typeof createNuxtWebRequest>[0],
): URLSearchParams {
  return new URL(createNuxtWebRequest(event).url).searchParams;
}

export function toStorefrontApiFilters(
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
