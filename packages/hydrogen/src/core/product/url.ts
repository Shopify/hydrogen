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

/**
 * How a product URL encodes the customer's variant selection.
 *
 * - `options`: one param per option, such as `?Color=Red&Size=M`.
 * - `variant`: a single `?variant=<numeric id>` param that matches Liquid storefront URLs.
 */
export type ProductSelectionLinkStyle = "options" | "variant";

/**
 * Builds the search params for a product URL that holds the customer's variant selection.
 *
 * The function keeps unrelated params from the base params, such as `?ref=campaign`, and replaces any earlier selection. Pass the current product's option names to clear the current product's params when you link to another product in a combined listing.
 *
 * The default options style writes one param per option. The variant style writes a single numeric variant ID param for shareable links.
 * The variant style falls back to option params when you pass no variant or when the variant ID isn't a numeric product variant GID.
 * The `handleShopifyRoutes` handler redirects variant links to option param URLs.
 *
 * @param input The selected options, the current product's option names, and an optional variant, link style, and base params.
 *
 * @returns New search params that hold the kept base params and the selection.
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
 * @publicDocs
 */
export function buildProductSelectionSearchParams({
  style = "options",
  selectedOptions,
  variant,
  optionNames,
  base,
}: {
  /**
   * Link style for the selection. Defaults to `"options"`.
   */
  style?: ProductSelectionLinkStyle;
  selectedOptions: readonly SelectedOption[];
  variant?: { id: string } | null;
  /**
   * Option names of the current product. The function clears the param for each name.
   */
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
