import { serializeCollectionParams, type ProductFilter } from "@shopify/hydrogen";

/** Serialize a Storefront API filter `input` string into form field entries. */
export function filterValueInputParamEntries(
  input: string,
): Array<{ name: string; value: string }> {
  let parsedFilter: unknown;
  try {
    parsedFilter = JSON.parse(input);
  } catch {
    return [];
  }
  if (!isProductFilter(parsedFilter)) return [];

  return Array.from(
    serializeCollectionParams({
      filters: [parsedFilter],
      sortKey: undefined,
      reverse: false,
    }),
    ([name, value]) => ({ name, value }),
  );
}

const PRODUCT_FILTER_VALIDATORS = {
  available: (value) => typeof value === "boolean",
  category: (value) => hasStringProperties(value, ["id"]),
  price: isPriceRange,
  productMetafield: (value) =>
    hasStringProperties(value, ["key", "namespace"]) && hasOptionalString(value, "value"),
  productType: (value) => typeof value === "string",
  productVendor: (value) => typeof value === "string",
  tag: (value) => typeof value === "string",
  taxonomyMetafield: (value) => hasStringProperties(value, ["key", "value"]),
  variantMetafield: (value) =>
    hasStringProperties(value, ["key", "namespace"]) && hasOptionalString(value, "value"),
  variantOption: (value) =>
    hasStringProperties(value, ["name"]) && hasOptionalString(value, "value"),
} satisfies Readonly<Record<keyof ProductFilter, (value: unknown) => boolean>>;

function isProductFilter(value: unknown): value is ProductFilter {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length > 0 &&
    entries.every(
      ([key, filterValue]) =>
        isProductFilterKey(key) && PRODUCT_FILTER_VALIDATORS[key](filterValue),
    )
  );
}

function isProductFilterKey(value: string): value is keyof ProductFilter {
  return Object.hasOwn(PRODUCT_FILTER_VALIDATORS, value);
}

function hasStringProperties(value: unknown, properties: string[]): boolean {
  return isRecord(value) && properties.every((property) => typeof value[property] === "string");
}

function hasOptionalString(value: unknown, property: string): boolean {
  return isRecord(value) && (value[property] === undefined || typeof value[property] === "string");
}

function isPriceRange(value: unknown): boolean {
  return (
    isRecord(value) &&
    isOptionalNumber(value, "min") &&
    isOptionalNumber(value, "max") &&
    ("min" in value || "max" in value)
  );
}

function isOptionalNumber(value: Record<string, unknown>, property: string): boolean {
  return value[property] === undefined || typeof value[property] === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
