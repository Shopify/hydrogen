import type { ProductFilter } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontProductFilter } from "@shopify/hydrogen/storefront-api-types";

/**
 * `parseCollectionParams` returns Hydrogen's `ProductFilter` (from the Standard
 * Events contract), where metafield and option `value`s are optional and
 * `taxonomyMetafield` has no `namespace`. The Storefront API input type requires
 * them. Filters the API would reject are dropped here instead of asserted.
 */
export function toStorefrontProductFilters(
  filters: readonly ProductFilter[],
): StorefrontProductFilter[] | undefined {
  const inputs = filters.flatMap(toStorefrontProductFilter);
  return inputs.length > 0 ? inputs : undefined;
}

function toStorefrontProductFilter(filter: ProductFilter): StorefrontProductFilter[] {
  const inputs: StorefrontProductFilter[] = [];

  if (filter.available !== undefined) inputs.push({ available: filter.available });
  if (filter.category) inputs.push({ category: filter.category });
  if (filter.price) inputs.push({ price: filter.price });
  if (filter.productType) inputs.push({ productType: filter.productType });
  if (filter.productVendor) inputs.push({ productVendor: filter.productVendor });
  if (filter.tag) inputs.push({ tag: filter.tag });

  const productMetafield = withRequiredValue(filter.productMetafield);
  if (productMetafield) inputs.push({ productMetafield });
  const variantMetafield = withRequiredValue(filter.variantMetafield);
  if (variantMetafield) inputs.push({ variantMetafield });
  const variantOption = withRequiredValue(filter.variantOption);
  if (variantOption) inputs.push({ variantOption });

  return inputs;
}

function withRequiredValue<T extends { value?: string }>(
  input: T | undefined,
): (T & { value: string }) | undefined {
  if (input?.value === undefined) return undefined;
  return { ...input, value: input.value };
}
