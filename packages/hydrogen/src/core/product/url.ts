import type { SelectedOption } from "./state";

const VARIANT_GID_PREFIX = "gid://shopify/ProductVariant/";

/**
 * Reserved product-page search param carrying a numeric variant id (`?variant=41820371452004`),
 * matching Liquid storefront URLs. Never treated as a product option name.
 */
export const VARIANT_SEARCH_PARAM = "variant";

/**
 * Converts a `?variant=` search param value into a variant id (gid).
 *
 * Anything that is not a plain positive integer of a plausible length is treated as absent
 * (`null`) so malformed links degrade to the default variant instead of producing invalid
 * API lookups or log spam.
 */
export function parseVariantSearchParam(value: string | null): string | null {
  if (!value || !/^\d{1,30}$/.test(value)) return null;
  return `${VARIANT_GID_PREFIX}${value}`;
}

/**
 * Extracts the numeric `?variant=` search param value from a variant id (gid).
 * Returns `null` for ids that are not canonical `gid://shopify/ProductVariant/<numeric>` ids.
 */
export function getVariantSearchParamValue(variantId: string): string | null {
  if (!variantId.startsWith(VARIANT_GID_PREFIX)) return null;

  const numericId = variantId.slice(VARIANT_GID_PREFIX.length);
  return /^\d+$/.test(numericId) ? numericId : null;
}

export type ProductSelectionLinkStyle = "options" | "variant";

/**
 * Builds the search params for a product-page link representing a variant selection.
 *
 * Existing `base` params are preserved (`?ref=campaign` survives navigation), except the
 * reserved `variant` param and every param named in `optionNames` or `selectedOptions`,
 * which are always removed before the new selection is written. This keeps stale selection
 * state from leaking between navigations, including across combined-listing products.
 *
 * Two link styles:
 * - `"options"` (default): one param per selected option, e.g. `?Color=Red&Size=M`.
 * - `"variant"`: a single `?variant=<numeric id>` param (Liquid parity), for shareable
 *   links. Falls back to option params when `variant` is absent — a partial selection has
 *   no matching variant, so a variant link is not constructible.
 *
 * @example
 * ```ts
 * const searchParams = buildProductSelectionSearchParams({
 *   selectedOptions: result.selectedOptions,
 *   variant: result.selectedVariant,
 *   optionNames: product.options.map((option) => option.name),
 *   base: new URLSearchParams(location.search),
 * });
 * const url = `/products/${handle}${searchParams.size ? `?${searchParams}` : ""}`;
 * ```
 */
export function buildProductSelectionSearchParams({
  style = "options",
  selectedOptions,
  variant,
  optionNames,
  base,
}: {
  style?: ProductSelectionLinkStyle;
  selectedOptions: readonly SelectedOption[];
  variant?: { id: string } | null;
  optionNames: readonly string[];
  base?: URLSearchParams;
}): URLSearchParams {
  const searchParams = new URLSearchParams(base);

  searchParams.delete(VARIANT_SEARCH_PARAM);
  for (const name of optionNames) searchParams.delete(name);
  for (const option of selectedOptions) searchParams.delete(option.name);

  const variantSearchParamValue =
    style === "variant" && variant ? getVariantSearchParamValue(variant.id) : null;

  if (variantSearchParamValue) {
    searchParams.set(VARIANT_SEARCH_PARAM, variantSearchParamValue);
    return searchParams;
  }

  for (const option of selectedOptions) {
    searchParams.set(option.name, option.value);
  }

  return searchParams;
}
