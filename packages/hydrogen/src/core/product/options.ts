import { getLogger } from "../logging";
import { VARIANT_SEARCH_PARAM } from "./url";
import type {
  ProductInput,
  ProductOptionValueFrom,
  ProductVariantFrom,
  ProductVariantInput,
  SelectedOption,
  VariantOptionState,
  VariantOptionValueState,
} from "./state";

const log = getLogger("product");

const INCLUSIVE_RANGE_END_OFFSET = 1;

export type DecodedVariantCache = Map<string, number[][]>;

type EncodedVariantConstraint = {
  optionIndex: number;
  valueIndex: number;
};

/**
 * Extracts selected product options from search params.
 *
 * Each query parameter is treated as an option name/value pair
 * (e.g. `?Color=Red&Size=M` → `[{name:"Color",value:"Red"},{name:"Size",value:"M"}]`).
 *
 * The `variant` param is reserved for numeric variant ids (Liquid parity; see
 * `acceptProductVariantId`) and is never treated as an option name, even when
 * listed in `allowedOptionNames`.
 *
 * When `allowedOptionNames` is provided, the search params are filtered to only
 * entries whose decoded param name exactly matches a product option name.
 * Passing an empty array filters out every option.
 *
 * Pass the result to `createProductFormStore` or `useProductForm` to pre-select
 * the variant that matches the current URL.
 *
 * @example
 * ```ts
 * // Loader (React Router / Remix)
 * const selectedOptions = getSelectedProductOptions({
 *   searchParams: new URL(request.url).searchParams,
 * });
 *
 * // Filter to known product option names when product data is available
 * const selectedOptions = getSelectedProductOptions({
 *   searchParams,
 *   allowedOptionNames: product.options.map((option) => option.name),
 * });
 * ```
 */
export function getSelectedProductOptions({
  searchParams,
  allowedOptionNames,
}: {
  searchParams: URLSearchParams;
  allowedOptionNames?: readonly string[];
}): SelectedOption[] {
  const allowedOptionNameSet = allowedOptionNames ? new Set(allowedOptionNames) : null;
  const selectedOptions: SelectedOption[] = [];

  for (const [name, value] of searchParams.entries()) {
    if (name === VARIANT_SEARCH_PARAM) continue;
    if (allowedOptionNameSet && !allowedOptionNameSet.has(name)) continue;
    selectedOptions.push({ name, value });
  }

  return selectedOptions;
}

function getAdjacentAndFirstSelectableVariants<TProduct extends ProductInput>(
  product: TProduct,
): ProductVariantFrom<TProduct>[] {
  // Shopify returns a bounded set, not the whole matrix. Treat it as a concrete-variant cache.
  const variants = new Map<string, ProductVariantFrom<TProduct>>();

  for (const option of product.options) {
    for (const value of option.optionValues) {
      if (isConcreteProductVariant<TProduct>(value.firstSelectableVariant)) {
        addVariant(variants, value.firstSelectableVariant, product.options);
      }
    }
  }

  for (const variant of product.adjacentVariants) {
    if (isConcreteProductVariant<TProduct>(variant)) addVariant(variants, variant, product.options);
  }

  if (isConcreteProductVariant<TProduct>(product.selectedOrFirstAvailableVariant)) {
    addVariant(variants, product.selectedOrFirstAvailableVariant, product.options);
  }

  return [...variants.values()];
}

export function buildProductOptions<TProduct extends ProductInput>(
  product: TProduct,
  selectedOptions: SelectedOption[],
  cache?: DecodedVariantCache,
): VariantOptionState<ProductVariantFrom<TProduct>, ProductOptionValueFrom<TProduct>>[] {
  const selectedOptionMap = selectedOptionsToMap(selectedOptions);
  const optionValueIndex = buildOptionValueIndex(product);
  const selectableVariants = getAdjacentAndFirstSelectableVariants(product);
  const encodedOptionIndexes = buildEncodedOptionIndexes(product, selectableVariants);
  const variants = mapVariants(product, selectableVariants);
  const currentProductOptionValues = buildCurrentProductOptionValues(product, selectableVariants);

  return product.options.map((option) => ({
    name: option.name,
    values: option.optionValues.map((value) =>
      buildProductOptionValue({
        cache,
        currentProductOptionValues,
        encodedOptionIndexes,
        option,
        optionValueIndex,
        product,
        selectedOptionMap,
        value,
        variants,
      }),
    ),
  }));
}

export function selectedOptionsToMap(selectedOptions: SelectedOption[]): Record<string, string> {
  const map: Record<string, string> = Object.create(null);
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

function mapVariants<TProduct extends ProductInput>(
  product: TProduct,
  selectableVariants: ProductVariantFrom<TProduct>[],
): Map<string, ProductVariantFrom<TProduct>> {
  const variants = new Map<string, ProductVariantFrom<TProduct>>();
  for (const variant of selectableVariants) {
    variants.set(selectedOptionsKey(variant.selectedOptions, product.options), variant);
  }
  return variants;
}

function addVariant<TVariant extends ProductVariantInput>(
  variants: Map<string, TVariant>,
  variant: TVariant,
  productOptions: Array<{ name: string }>,
): void {
  variants.set(selectedOptionsKey(variant.selectedOptions, productOptions), variant);
}

function buildProductOptionValue<TProduct extends ProductInput>({
  cache,
  currentProductOptionValues,
  encodedOptionIndexes,
  option,
  optionValueIndex,
  product,
  selectedOptionMap,
  value,
  variants,
}: {
  cache?: DecodedVariantCache;
  currentProductOptionValues: Map<string, Set<string>>;
  encodedOptionIndexes: Map<string, Map<string, number>>;
  option: TProduct["options"][number];
  optionValueIndex: Map<string, Map<string, number>>;
  product: TProduct;
  selectedOptionMap: Record<string, string>;
  value: ProductOptionValueFrom<TProduct>;
  variants: Map<string, ProductVariantFrom<TProduct>>;
}): VariantOptionValueState<ProductVariantFrom<TProduct>, ProductOptionValueFrom<TProduct>> {
  const firstSelectableVariant = isConcreteProductVariant<TProduct>(value.firstSelectableVariant)
    ? value.firstSelectableVariant
    : null;
  const selected = selectedOptionMap[option.name] === value.name;
  const crossProduct = isCrossProductOptionValue(
    product,
    option.name,
    value.name,
    firstSelectableVariant,
    currentProductOptionValues,
  );
  const targetOptionMap = buildTargetOptionMap({
    currentProductOptionValues,
    crossProduct,
    firstSelectableVariant,
    optionName: option.name,
    selectedOptionMap,
    valueName: value.name,
  });
  const targetSelectedOptions = selectedOptionsFromMap(product, targetOptionMap);
  const key = selectedOptionsKey(targetSelectedOptions, product.options);
  const variant = variants.get(key) ?? null;
  const targetProductHandle = getTargetProductHandle(product, crossProduct, firstSelectableVariant);
  const encodingConstraints = buildEncodingConstraints(
    targetOptionMap,
    product,
    optionValueIndex,
    encodedOptionIndexes.get(targetProductHandle),
  );

  return {
    name: value.name,
    swatch: value.swatch,
    selected,
    exists: resolveEncodedStatus(product.encodedVariantExistence, encodingConstraints, true, cache),
    available: resolveEncodedStatus(
      product.encodedVariantAvailability,
      encodingConstraints,
      variant?.availableForSale ?? false,
      cache,
    ),
    variant,
    selectedOptions: variant?.selectedOptions ?? targetSelectedOptions,
    handle: getOptionValueHandle(selected, product.handle, variant, firstSelectableVariant),
  };
}

function getOptionValueHandle<TVariant extends ProductVariantInput>(
  selected: boolean,
  productHandle: string,
  variant: TVariant | null,
  firstSelectableVariant: TVariant | null,
): string {
  if (selected) return productHandle;
  return variant?.product?.handle ?? firstSelectableVariant?.product?.handle ?? productHandle;
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

function getTargetProductHandle<TVariant extends ProductVariantInput>(
  product: ProductInput,
  crossProduct: boolean,
  firstSelectableVariant: TVariant | null,
): string {
  if (crossProduct && firstSelectableVariant?.product?.handle) {
    return firstSelectableVariant.product.handle;
  }
  return product.handle;
}

function buildEncodedOptionIndexes<TProduct extends ProductInput>(
  product: TProduct,
  selectableVariants: ProductVariantFrom<TProduct>[],
): Map<string, Map<string, number>> {
  const indexes = new Map<string, Map<string, number>>();
  for (const variant of selectableVariants) {
    const productHandle = variant.product?.handle ?? product.handle;
    addEncodedOptionIndex(indexes, productHandle, product.options, variant.selectedOptions);
  }
  return indexes;
}

function addEncodedOptionIndex(
  indexes: Map<string, Map<string, number>>,
  productHandle: string,
  productOptions: Array<{ name: string }>,
  selectedOptions: SelectedOption[],
): void {
  const index = indexes.get(productHandle) ?? new Map<string, number>();
  const selectedOptionNames = new Set(selectedOptions.map((option) => option.name));

  for (const option of productOptions) {
    if (!selectedOptionNames.has(option.name) || index.has(option.name)) continue;
    index.set(option.name, index.size);
  }

  indexes.set(productHandle, index);
}

function buildCurrentProductOptionValues<TProduct extends ProductInput>(
  product: TProduct,
  selectableVariants: ProductVariantFrom<TProduct>[],
): Map<string, Set<string>> {
  const optionValues = new Map<string, Set<string>>();
  for (const variant of selectableVariants) {
    if (!variantBelongsToProduct(product, variant)) continue;
    for (const option of variant.selectedOptions) {
      addCurrentProductOptionValue(optionValues, option.name, option.value);
    }
  }
  return optionValues;
}

function addCurrentProductOptionValue(
  optionValues: Map<string, Set<string>>,
  optionName: string,
  valueName: string,
): void {
  const values = optionValues.get(optionName) ?? new Set<string>();
  values.add(valueName);
  optionValues.set(optionName, values);
}

function isCrossProductOptionValue<TVariant extends ProductVariantInput>(
  product: ProductInput,
  optionName: string,
  valueName: string,
  firstSelectableVariant: TVariant | null,
  currentProductOptionValues: Map<string, Set<string>>,
): boolean {
  if (!firstSelectableVariant || variantBelongsToProduct(product, firstSelectableVariant)) {
    return false;
  }
  return !currentProductOptionValues.get(optionName)?.has(valueName);
}

function variantBelongsToProduct<TVariant extends ProductVariantInput>(
  product: ProductInput,
  variant: TVariant,
): boolean {
  return variant.product?.handle === undefined || variant.product.handle === product.handle;
}

type TargetOptionMapInput<TVariant extends ProductVariantInput> = {
  currentProductOptionValues: Map<string, Set<string>>;
  crossProduct: boolean;
  firstSelectableVariant: TVariant | null;
  optionName: string;
  selectedOptionMap: Record<string, string>;
  valueName: string;
};

function buildTargetOptionMap<TVariant extends ProductVariantInput>({
  currentProductOptionValues,
  crossProduct,
  firstSelectableVariant,
  optionName,
  selectedOptionMap,
  valueName,
}: TargetOptionMapInput<TVariant>): Record<string, string> {
  if (crossProduct && firstSelectableVariant) {
    return selectedOptionsToMap(firstSelectableVariant.selectedOptions);
  }

  const nextOptionMap = { ...selectedOptionMap, [optionName]: valueName };
  if (currentProductOptionValues.size === 0) return nextOptionMap;
  return filterOptionMap(nextOptionMap, currentProductOptionValues);
}

function filterOptionMap(
  selectedOptionMap: Record<string, string>,
  currentProductOptionValues: Map<string, Set<string>>,
): Record<string, string> {
  const filtered: Record<string, string> = Object.create(null);
  for (const [optionName, values] of currentProductOptionValues) {
    const value = selectedOptionMap[optionName];
    if (value !== undefined && values.has(value)) filtered[optionName] = value;
  }
  return filtered;
}

function buildEncodingConstraints<TProduct extends ProductInput>(
  selectedOptionMap: Record<string, string>,
  product: TProduct,
  optionValueIndex = buildOptionValueIndex(product),
  encodedOptionIndex?: Map<string, number>,
): EncodedVariantConstraint[] {
  const constraints: EncodedVariantConstraint[] = [];

  for (const [productOptionIndex, option] of product.options.entries()) {
    const selectedValue = selectedOptionMap[option.name];
    if (selectedValue === undefined) continue;
    const optionIndex = encodedOptionIndex?.get(option.name) ?? productOptionIndex;
    const valueIndex = optionValueIndex.get(option.name)?.get(selectedValue);
    if (valueIndex === undefined) continue;
    constraints.push({ optionIndex, valueIndex });
  }

  return constraints;
}

function resolveEncodedStatus(
  encodedField: string | null | undefined,
  constraints: EncodedVariantConstraint[],
  fallback: boolean,
  cache?: DecodedVariantCache,
): boolean {
  if (!encodedField) return fallback;
  return isAnyEncodedVariantMatchingConstraints(constraints, encodedField, cache);
}

function isAnyEncodedVariantMatchingConstraints(
  constraints: EncodedVariantConstraint[],
  encodedVariantField: string,
  cache?: DecodedVariantCache,
): boolean {
  if (constraints.length === 0) return false;

  return getDecodedVariantCombinations(encodedVariantField, cache).some((combination) =>
    combinationMatchesConstraints(combination, constraints),
  );
}

function getDecodedVariantCombinations(
  encodedVariantField: string,
  cache?: DecodedVariantCache,
): number[][] {
  const cached = cache?.get(encodedVariantField);
  if (cached) return cached;

  const decoded = decodeEncodedVariant(encodedVariantField);
  cache?.set(encodedVariantField, decoded);
  return decoded;
}

function combinationMatchesConstraints(
  combination: number[],
  constraints: EncodedVariantConstraint[],
): boolean {
  return constraints.every(
    ({ optionIndex, valueIndex }) => combination[optionIndex] === valueIndex,
  );
}

function decodeEncodedVariant(encodedVariantField: string | null | undefined): number[][] {
  if (!encodedVariantField) return [];
  if (!encodedVariantField.startsWith("v1_")) {
    log.warn(`unsupported variant encoding: "${encodedVariantField}"`);
    return [];
  }
  return decodeV1EncodedVariant(encodedVariantField.replace(/^v1_/, ""));
}

function decodeV1EncodedVariant(encodedVariantField: string): number[][] {
  const tokenizer = /[ :,-]/g;
  const state: DecodeV1State = {
    currentOptionValue: [],
    decodedOptions: [],
    depth: 0,
    index: 0,
    rangeStart: null,
  };
  let token: RegExpExecArray | null;

  while ((token = tokenizer.exec(encodedVariantField))) {
    processDecodeV1Token(encodedVariantField, state, token, tokenizer);
  }

  pushFinalDecodeV1Value(encodedVariantField, state);

  return state.decodedOptions;
}

type DecodeV1State = {
  currentOptionValue: number[];
  decodedOptions: number[][];
  depth: number;
  index: number;
  rangeStart: number | null;
};

function isConcreteProductVariant<TProduct extends ProductInput>(
  variant: ProductVariantInput | null | undefined,
): variant is ProductVariantFrom<TProduct> {
  return variant !== null && variant !== undefined;
}

function processDecodeV1Token(
  encodedVariantField: string,
  state: DecodeV1State,
  token: RegExpExecArray,
  tokenizer: RegExp,
): void {
  const operation = token[0];
  const optionValueIndex =
    Number.parseInt(encodedVariantField.slice(state.index, token.index), 10) || 0;

  pushDecodeV1Range(state, optionValueIndex);
  state.currentOptionValue[state.depth] = optionValueIndex;

  if (operation === "-") {
    state.rangeStart = optionValueIndex;
  } else if (operation === ":") {
    state.depth++;
  } else {
    processDecodeV1Separator(encodedVariantField, state, token, operation);
  }

  state.index = tokenizer.lastIndex;
}

function processDecodeV1Separator(
  encodedVariantField: string,
  state: DecodeV1State,
  token: RegExpExecArray,
  operation: string,
): void {
  if (shouldPushDecodeV1Option(encodedVariantField, token, operation)) {
    state.decodedOptions.push([...state.currentOptionValue]);
  }

  if (operation !== ",") return;

  state.currentOptionValue.pop();
  state.depth--;
}

function shouldPushDecodeV1Option(
  encodedVariantField: string,
  token: RegExpExecArray,
  operation: string,
): boolean {
  return operation === " " || (operation === "," && encodedVariantField[token.index - 1] !== ",");
}

function pushFinalDecodeV1Value(encodedVariantField: string, state: DecodeV1State): void {
  const finalIndex = encodedVariantField.match(/\d+$/g)?.[0];
  if (finalIndex === undefined) return;

  const finalValueIndex = Number.parseInt(finalIndex, 10);
  if (state.rangeStart !== null) {
    pushDecodeV1Range(state, finalValueIndex + INCLUSIVE_RANGE_END_OFFSET);
    return;
  }

  state.currentOptionValue[state.depth] = finalValueIndex;
  state.decodedOptions.push([...state.currentOptionValue]);
}

function pushDecodeV1Range(state: DecodeV1State, rangeEndExclusive: number): void {
  const rangeStart = state.rangeStart;
  if (rangeStart === null) return;

  for (let value = rangeStart; value < rangeEndExclusive; value++) {
    state.currentOptionValue[state.depth] = value;
    state.decodedOptions.push([...state.currentOptionValue]);
  }

  state.rangeStart = null;
}
