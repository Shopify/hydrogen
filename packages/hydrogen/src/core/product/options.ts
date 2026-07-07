import type {
  ProductInput,
  ProductOptionValueFrom,
  ProductVariantFrom,
  SelectedOption,
  VariantOptionState,
  VariantOptionValueState,
} from "./state";

const OPTION_VALUE_SEPARATOR = ",";

export type DecodedVariantCache = Map<string, Set<string>>;

/**
 * Extracts selected product options from a URL or search params.
 *
 * Each query parameter is treated as an option name/value pair
 * (e.g. `?Color=Red&Size=M` → `[{name:"Color",value:"Red"},{name:"Size",value:"M"}]`).
 *
 * Pass the result to `createProductFormStore` or `useProductForm` to pre-select
 * the variant that matches the current URL.
 *
 * @param input - A `Request`, `URL`, `URLSearchParams`, or URL string.
 * @param options.optionNames - When provided, only parameters whose names are
 *   in this list are included. Useful to avoid picking up unrelated query params.
 *
 * @example
 * ```ts
 * // Loader (React Router / Remix)
 * const selectedOptions = getSelectedProductOptions(request);
 *
 * // Non-framework / plain JS
 * const params = new URL(window.location.href).searchParams;
 * const selectedOptions = getSelectedProductOptions(params);
 * ```
 */
export function getSelectedProductOptions(
  input: Request | URL | URLSearchParams | string,
  options: { optionNames?: string[] } = {},
): SelectedOption[] {
  const params = toSearchParams(input);
  const optionNames = options.optionNames ? new Set(options.optionNames) : null;
  const selectedOptions: SelectedOption[] = [];

  for (const [name, value] of params.entries()) {
    if (optionNames && !optionNames.has(name)) continue;
    selectedOptions.push({ name, value });
  }

  return selectedOptions;
}

export function getAdjacentAndFirstSelectableVariants<TProduct extends ProductInput>(
  product: TProduct,
): ProductVariantFrom<TProduct>[] {
  // Shopify returns a bounded set, not the whole matrix. Treat it as a concrete-variant cache.
  const variants = new Map<string, ProductVariantFrom<TProduct>>();

  for (const option of product.options) {
    for (const value of option.optionValues) {
      if (value.firstSelectableVariant) {
        variants.set(
          selectedOptionsKey(value.firstSelectableVariant.selectedOptions, product.options),
          value.firstSelectableVariant as ProductVariantFrom<TProduct>,
        );
      }
    }
  }

  for (const variant of product.adjacentVariants) {
    variants.set(
      selectedOptionsKey(variant.selectedOptions, product.options),
      variant as ProductVariantFrom<TProduct>,
    );
  }

  if (product.selectedOrFirstAvailableVariant) {
    variants.set(
      selectedOptionsKey(product.selectedOrFirstAvailableVariant.selectedOptions, product.options),
      product.selectedOrFirstAvailableVariant as ProductVariantFrom<TProduct>,
    );
  }

  return [...variants.values()];
}

export function buildProductOptions<TProduct extends ProductInput>(
  product: TProduct,
  selectedOptions: SelectedOption[],
  cache?: DecodedVariantCache,
): VariantOptionState<ProductVariantFrom<TProduct>, ProductOptionValueFrom<TProduct>>[] {
  const selectedOptionMap = selectedOptionsToMap(selectedOptions);
  const optionIndexByName = new Map(product.options.map((option, index) => [option.name, index]));
  const optionValueIndex = buildOptionValueIndex(product);
  const variants = mapVariants(product);

  return product.options.map((option) => ({
    name: option.name,
    values: option.optionValues.map(
      (
        value,
      ): VariantOptionValueState<
        ProductVariantFrom<TProduct>,
        ProductOptionValueFrom<TProduct>
      > => {
        const targetOptionMap = { ...selectedOptionMap, [option.name]: value.name };
        const targetSelectedOptions = selectedOptionsFromMap(product, targetOptionMap);
        const key = selectedOptionsKey(targetSelectedOptions, product.options);
        const variant = (variants.get(key) as ProductVariantFrom<TProduct> | undefined) ?? null;
        const resolvedSelectedOptions = variant?.selectedOptions ?? targetSelectedOptions;
        const firstSelectableVariant =
          (value.firstSelectableVariant as ProductVariantFrom<TProduct> | null | undefined) ?? null;
        const encoding = buildEncodingArray(targetOptionMap, product, optionValueIndex);
        const optionIndex = optionIndexByName.get(option.name) ?? 0;
        const topDownEncoding = encoding.slice(0, optionIndex + 1);
        const selected = selectedOptionMap[option.name] === value.name;
        const exists = resolveEncodedStatus(
          product.encodedVariantExistence,
          topDownEncoding,
          true,
          cache,
        );
        const available = resolveEncodedStatus(
          product.encodedVariantAvailability,
          topDownEncoding,
          variant?.availableForSale ?? false,
          cache,
        );
        const handle = selected
          ? product.handle
          : (variant?.product?.handle ?? firstSelectableVariant?.product?.handle ?? product.handle);

        return {
          name: value.name,
          swatch: value.swatch,
          selected,
          exists,
          available,
          variant,
          selectedOptions: resolvedSelectedOptions,
          handle,
        };
      },
    ),
  }));
}

export function selectedOptionsToMap(selectedOptions: SelectedOption[]): Record<string, string> {
  const map: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const option of selectedOptions) {
    map[option.name] = option.value;
  }
  return map;
}

function selectedOptionsKey(
  selectedOptions: SelectedOption[],
  productOptions: Array<{ name: string }>,
): string {
  return JSON.stringify(
    selectedOptionsFromMap({ options: productOptions }, selectedOptionsToMap(selectedOptions)),
  );
}

export function selectedOptionsFromMap(
  product: { options: Array<{ name: string }> },
  selectedOptionMap: Record<string, string>,
): SelectedOption[] {
  const selectedOptions: SelectedOption[] = [];
  for (const option of product.options) {
    const value = selectedOptionMap[option.name];
    if (value !== undefined) selectedOptions.push({ name: option.name, value });
  }
  return selectedOptions;
}

function toSearchParams(input: Request | URL | URLSearchParams | string): URLSearchParams {
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  if (input instanceof URL) return new URLSearchParams(input.searchParams);
  if (typeof Request !== "undefined" && input instanceof Request) {
    return new URLSearchParams(new URL(input.url).searchParams);
  }

  const value = String(input);
  try {
    return new URLSearchParams(new URL(value).searchParams);
  } catch {
    return new URLSearchParams(value.startsWith("?") ? value.slice(1) : value);
  }
}

function mapVariants<TProduct extends ProductInput>(
  product: TProduct,
): Map<string, ProductVariantFrom<TProduct>> {
  const variants = new Map<string, ProductVariantFrom<TProduct>>();
  for (const variant of getAdjacentAndFirstSelectableVariants(product)) {
    variants.set(selectedOptionsKey(variant.selectedOptions, product.options), variant);
  }
  return variants;
}

function buildOptionValueIndex<TProduct extends ProductInput>(
  product: TProduct,
): Map<string, Map<string, number>> {
  return new Map(
    product.options.map((option) => [
      option.name,
      new Map(option.optionValues.map((value, index) => [value.name, index])),
    ]),
  );
}

function buildEncodingArray<TProduct extends ProductInput>(
  selectedOptionMap: Record<string, string>,
  product: TProduct,
  optionValueIndex = buildOptionValueIndex(product),
): number[] {
  const encoding: number[] = [];

  for (const option of product.options) {
    const selectedValue = selectedOptionMap[option.name];
    if (selectedValue === undefined) continue;
    const index = optionValueIndex.get(option.name)?.get(selectedValue);
    if (index !== undefined) encoding.push(index);
  }

  return encoding;
}

function resolveEncodedStatus(
  encodedField: string | null | undefined,
  targetEncoding: number[],
  fallback: boolean,
  cache?: DecodedVariantCache,
): boolean {
  if (!encodedField) return fallback;
  return isOptionValueCombinationInEncodedVariant(targetEncoding, encodedField, cache);
}

function isOptionValueCombinationInEncodedVariant(
  targetOptionValueCombination: number[],
  encodedVariantField: string,
  cache?: DecodedVariantCache,
): boolean {
  if (targetOptionValueCombination.length === 0) return false;

  let decoded = cache?.get(encodedVariantField);
  if (!decoded) {
    decoded = new Set<string>();
    for (const optionValue of decodeEncodedVariant(encodedVariantField)) {
      for (let i = 0; i < optionValue.length; i++) {
        decoded.add(optionValue.slice(0, i + 1).join(OPTION_VALUE_SEPARATOR));
      }
    }
    cache?.set(encodedVariantField, decoded);
  }

  return decoded.has(targetOptionValueCombination.join(OPTION_VALUE_SEPARATOR));
}

export function decodeEncodedVariant(encodedVariantField: string | null | undefined): number[][] {
  if (!encodedVariantField) return [];
  if (!encodedVariantField.startsWith("v1_")) {
    if (typeof console !== "undefined") {
      console.warn(`[hydrogen] Unsupported variant encoding: "${encodedVariantField}"`);
    }
    return [];
  }
  return decodeV1EncodedVariant(encodedVariantField.replace(/^v1_/, ""));
}

function decodeV1EncodedVariant(encodedVariantField: string): number[][] {
  const tokenizer = /[ :,-]/g;
  const decodedOptions: number[][] = [];
  const currentOptionValue: number[] = [];
  let index = 0;
  let depth = 0;
  let rangeStart: number | null = null;
  let token: RegExpExecArray | null;

  while ((token = tokenizer.exec(encodedVariantField))) {
    const operation = token[0];
    const optionValueIndex =
      Number.parseInt(encodedVariantField.slice(index, token.index), 10) || 0;

    if (rangeStart !== null) {
      for (; rangeStart < optionValueIndex; rangeStart++) {
        currentOptionValue[depth] = rangeStart;
        decodedOptions.push([...currentOptionValue]);
      }
      rangeStart = null;
    }

    currentOptionValue[depth] = optionValueIndex;

    if (operation === "-") {
      rangeStart = optionValueIndex;
    } else if (operation === ":") {
      depth++;
    } else {
      if (
        operation === " " ||
        (operation === "," && encodedVariantField[token.index - 1] !== ",")
      ) {
        decodedOptions.push([...currentOptionValue]);
      }

      if (operation === ",") {
        currentOptionValue.pop();
        depth--;
      }
    }

    index = tokenizer.lastIndex;
  }

  const finalIndex = encodedVariantField.match(/\d+$/g)?.[0];
  if (finalIndex !== undefined) {
    const finalValueIndex = Number.parseInt(finalIndex, 10);
    if (rangeStart !== null) {
      for (; rangeStart <= finalValueIndex; rangeStart++) {
        currentOptionValue[depth] = rangeStart;
        decodedOptions.push([...currentOptionValue]);
      }
    } else {
      currentOptionValue[depth] = finalValueIndex;
      decodedOptions.push([...currentOptionValue]);
    }
  }

  return decodedOptions;
}
