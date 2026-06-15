import type { CartStore } from "../cart/cart";
import type {
  CartLine,
  CartNetworkEntry,
  CartState,
  CartUserError,
  CartWarning,
} from "../cart/state";
import { createObservable } from "../observable";
import {
  buildProductOptions,
  type DecodedVariantCache,
  selectedOptionsFromMap,
  selectedOptionsToMap,
} from "./options";
import type {
  ProductInput,
  ProductVariantFrom,
  ProductVariantInput,
  SelectedOption,
  VariantOptionState,
} from "./state";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ProductFormErrors {
  userErrors: CartUserError[];
  warnings: CartWarning[];
  networkErrors: CartNetworkEntry[];
}

/** Live state snapshot emitted by a {@link ProductFormStore}. */
export interface ProductFormStoreState<TVariant extends ProductVariantInput = ProductVariantInput> {
  options: VariantOptionState<TVariant>[];
  selectedOptions: SelectedOption[];
  selectedVariant: TVariant | null;
  errors: ProductFormErrors;
  matchedLineItem: CartLine | null;
}

/**
 * Result returned by {@link ProductFormStore.selectOption}.
 *
 * - `resolved` — a specific variant was matched for the full selection.
 * - `unresolved` — the selection is valid but not yet complete.
 * - `invalid` — the option name or value does not exist on the product.
 */
export type VariantSelectionResult<TVariant extends ProductVariantInput = ProductVariantInput> =
  | {
      status: "resolved";
      selectedOptions: SelectedOption[];
      selectedVariant: TVariant;
    }
  | {
      status: "unresolved";
      selectedOptions: SelectedOption[];
      selectedVariant: null;
    }
  | {
      status: "invalid";
      selectedOptions: SelectedOption[];
      selectedVariant: null;
      reason: string;
    };

export type CreateProductFormStoreOptions = {
  selectedOptions?: SelectedOption[];
};

/** Manages variant selection + cart integration for a product form. */
export interface ProductFormStore<
  TProduct extends ProductInput = ProductInput,
  TVariant extends ProductVariantInput = ProductVariantFrom<TProduct>,
> {
  getState(): ProductFormStoreState<TVariant>;
  subscribe(listener: (state: ProductFormStoreState<TVariant>) => void): () => void;
  selectOption(name: string, value: string): VariantSelectionResult<TVariant>;
  hydrate(product: TProduct, opts?: { selectedOptions?: SelectedOption[] }): void;
  reset(): void;
  destroy(): void;
  handleFormSubmit(event: SubmitEvent): Promise<void>;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function getSelectedVariant<TVariant extends ProductVariantInput>(
  options: VariantOptionState<TVariant>[],
): TVariant | null {
  return options[0]?.values.find((v) => v.selected)?.variant ?? null;
}

export function canAddToCart<TProduct extends ProductInput>(
  product: TProduct,
  options: VariantOptionState<ProductVariantFrom<TProduct>>[],
): boolean {
  if (product.requiresSellingPlan) return false;
  const variant = getSelectedVariant(options);
  return variant !== null && variant.availableForSale;
}

/**
 * Finds the first cart line whose merchandise ID matches.
 * When selling plans are used, the same merchandise ID can appear on multiple
 * cart lines — this returns the first match. Future attribute-based matching
 * will narrow to the exact line.
 */
export function findCartLineByMerchandiseId(
  lines: CartLine[],
  merchandiseId: string,
): CartLine | null {
  return lines.find((l) => l.merchandise?.id === merchandiseId) ?? null;
}

// ---------------------------------------------------------------------------
// Internal context
// ---------------------------------------------------------------------------

type ProductFormStoreContext<TProduct extends ProductInput> = {
  observable: ReturnType<
    typeof createObservable<ProductFormStoreState<ProductVariantFrom<TProduct>>>
  >;
  cartStore: CartStore;
  currentProduct: TProduct;
  initialProduct: TProduct;
  initialSelectedOptions: SelectedOption[];
  decodedVariantCache: DecodedVariantCache;
  destroyed: boolean;
  unsubCart: () => void;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createProductFormStore<TProduct extends ProductInput>(
  product: TProduct,
  cartStore: CartStore,
  options: CreateProductFormStoreOptions = {},
): ProductFormStore<TProduct, ProductVariantFrom<TProduct>> {
  const decodedVariantCache: DecodedVariantCache = new Map();
  const initialSelectedOptions = resolveSelectedOptions(product, options.selectedOptions);

  const variantState = buildVariantState(product, initialSelectedOptions, decodedVariantCache);

  const context: ProductFormStoreContext<TProduct> = {
    observable: createObservable(deriveFullState(variantState, cartStore.getState())),
    cartStore,
    currentProduct: product,
    initialProduct: product,
    initialSelectedOptions,
    decodedVariantCache,
    destroyed: false,
    unsubCart: () => {},
  };

  context.unsubCart = cartStore.subscribe(() => {
    if (context.destroyed) return;
    syncFromCart(context);
  });

  return {
    getState: () => context.observable.state,
    subscribe: (listener) => context.observable.subscribe(listener),
    selectOption: (name, value) => selectOption(context, name, value),
    hydrate: (nextProduct, opts) => hydrate(context, nextProduct, opts),
    reset: () => reset(context),
    destroy: () => destroy(context),
    handleFormSubmit: (event) => handleFormSubmit(context, event),
  };
}

// ---------------------------------------------------------------------------
// State builders
// ---------------------------------------------------------------------------

type VariantOnlyState<TProduct extends ProductInput> = {
  options: VariantOptionState<ProductVariantFrom<TProduct>>[];
  selectedOptions: SelectedOption[];
};

function buildVariantState<TProduct extends ProductInput>(
  product: TProduct,
  selectedOptions: SelectedOption[],
  cache: DecodedVariantCache,
): VariantOnlyState<TProduct> {
  return {
    options: buildProductOptions(product, selectedOptions, cache),
    selectedOptions,
  };
}

function deriveFullState<TProduct extends ProductInput>(
  variant: VariantOnlyState<TProduct>,
  cartState: CartState,
): ProductFormStoreState<ProductVariantFrom<TProduct>> {
  const selectedVariant = getSelectedVariant(variant.options);
  const matchedLineItem = selectedVariant
    ? findCartLineByMerchandiseId(cartState.data.lines.nodes, selectedVariant.id)
    : null;

  const lineErrors = matchedLineItem ? cartState.errors.lines.get(matchedLineItem.id) : undefined;

  return {
    options: variant.options,
    selectedOptions: variant.selectedOptions,
    selectedVariant,
    errors: {
      userErrors: [...cartState.errors.cart.userErrors, ...(lineErrors?.userErrors ?? [])],
      warnings: [...cartState.errors.cart.warnings, ...(lineErrors?.warnings ?? [])],
      networkErrors: cartState.errors.network,
    },
    matchedLineItem,
  };
}

function resolveSelectedOptions<TProduct extends ProductInput>(
  product: TProduct,
  requested?: SelectedOption[],
): SelectedOption[] {
  return product.selectedOrFirstAvailableVariant?.selectedOptions ?? requested ?? [];
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function selectOption<TProduct extends ProductInput>(
  context: ProductFormStoreContext<TProduct>,
  name: string,
  value: string,
): VariantSelectionResult<ProductVariantFrom<TProduct>> {
  const { options, selectedOptions } = context.observable.state;
  const option = options.find((o) => o.name === name);
  const optionValue = option?.values.find((v) => v.name === value);

  if (!option || !optionValue) {
    return invalid(selectedOptions, `Unknown option "${name}" value "${value}".`);
  }

  if (!optionValue.exists) {
    return invalid(
      selectedOptions,
      `Option "${name}" value "${value}" does not resolve to a product variant.`,
    );
  }

  const nextSelectedOptionMap = {
    ...selectedOptionsToMap(selectedOptions),
    [name]: value,
  };
  const nextSelectedOptions = selectedOptionsFromMap(context.currentProduct, nextSelectedOptionMap);

  return applySelection(
    context,
    optionValue.variant
      ? {
          status: "resolved",
          selectedOptions: optionValue.variant.selectedOptions,
          selectedVariant: optionValue.variant as ProductVariantFrom<TProduct>,
        }
      : {
          status: "unresolved",
          selectedOptions: nextSelectedOptions,
          selectedVariant: null,
        },
  );
}

function hydrate<TProduct extends ProductInput>(
  context: ProductFormStoreContext<TProduct>,
  product: TProduct,
  opts: { selectedOptions?: SelectedOption[] } = {},
): void {
  context.currentProduct = product;
  context.decodedVariantCache.clear();
  const selectedOptions =
    product.selectedOrFirstAvailableVariant?.selectedOptions ??
    opts.selectedOptions ??
    context.observable.state.selectedOptions;
  const variantState = buildVariantState(product, selectedOptions, context.decodedVariantCache);
  context.observable.setState(deriveFullState(variantState, context.cartStore.getState()));
}

function reset<TProduct extends ProductInput>(context: ProductFormStoreContext<TProduct>): void {
  context.currentProduct = context.initialProduct;
  context.decodedVariantCache.clear();
  const variantState = buildVariantState(
    context.initialProduct,
    context.initialSelectedOptions,
    context.decodedVariantCache,
  );
  context.observable.setState(deriveFullState(variantState, context.cartStore.getState()));
}

function destroy<TProduct extends ProductInput>(context: ProductFormStoreContext<TProduct>): void {
  context.destroyed = true;
  context.unsubCart();
  context.decodedVariantCache.clear();
}

function buildAddToCartDetail<TProduct extends ProductInput>(
  context: ProductFormStoreContext<TProduct>,
): Record<string, unknown> | undefined {
  const { selectedVariant } = context.observable.state;
  if (!selectedVariant) return undefined;

  return { products: [selectedVariant] };
}

async function handleFormSubmit<TProduct extends ProductInput>(
  context: ProductFormStoreContext<TProduct>,
  event: SubmitEvent,
): Promise<void> {
  const eventDetail = buildAddToCartDetail(context);
  await context.cartStore.handleFormSubmit(event, eventDetail);
}

function applySelection<TProduct extends ProductInput>(
  context: ProductFormStoreContext<TProduct>,
  result: Exclude<VariantSelectionResult<ProductVariantFrom<TProduct>>, { status: "invalid" }>,
): VariantSelectionResult<ProductVariantFrom<TProduct>> {
  const variantState = buildVariantState(
    context.currentProduct,
    result.selectedOptions,
    context.decodedVariantCache,
  );
  context.observable.setState(deriveFullState(variantState, context.cartStore.getState()));
  return result;
}

function hasCartDerivedFieldsChanged<TVariant extends ProductVariantInput>(
  prev: ProductFormStoreState<TVariant>,
  next: ProductFormStoreState<TVariant>,
): boolean {
  return (
    prev.matchedLineItem !== next.matchedLineItem ||
    prev.selectedVariant !== next.selectedVariant ||
    prev.errors.userErrors !== next.errors.userErrors ||
    prev.errors.warnings !== next.errors.warnings ||
    prev.errors.networkErrors !== next.errors.networkErrors
  );
}

function syncFromCart<TProduct extends ProductInput>(
  context: ProductFormStoreContext<TProduct>,
): void {
  const prev = context.observable.state;
  const next = deriveFullState(
    { options: prev.options, selectedOptions: prev.selectedOptions },
    context.cartStore.getState(),
  );

  if (hasCartDerivedFieldsChanged(prev, next)) {
    context.observable.setState(next);
  }
}

function invalid<TVariant extends ProductVariantInput>(
  selectedOptions: SelectedOption[],
  reason: string,
): VariantSelectionResult<TVariant> {
  return {
    status: "invalid",
    selectedOptions,
    selectedVariant: null,
    reason,
  };
}
