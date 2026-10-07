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
  ProductOptionValueFrom,
  ProductOptionValueInput,
  ProductVariantFrom,
  ProductVariantInput,
  SelectedOption,
  VariantOptionState,
} from "./state";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Cart and cart line errors that a product form store reports.
 *
 * The store merges cart-level errors and warnings with the errors and warnings of the matched cart line. Render the user errors and warnings near the add-to-cart button.
 */
export interface ProductFormErrors {
  /** Cart-level user errors, followed by user errors for the matched cart line. */
  userErrors: CartUserError[];
  /** Cart-level warnings, followed by warnings for the matched cart line. */
  warnings: CartWarning[];
  /** Network failures from the cart store. Each failure has a message and, when available, an HTTP status. */
  networkErrors: CartNetworkEntry[];
}

/** State snapshot that a product form store emits. */
export interface ProductFormStoreState<
  TVariant extends ProductVariantInput = ProductVariantInput,
  TOptionValue extends ProductOptionValueInput = ProductOptionValueInput,
> {
  /** Computed state for each product option and its values under the current selection. */
  options: VariantOptionState<TVariant, TOptionValue>[];
  /** Option names and values in the current selection, which can be partial. */
  selectedOptions: SelectedOption[];
  /** Variant for the current selection, or `null` when the selection is partial or the query result doesn't include the variant. */
  selectedVariant: TVariant | null;
  /** Cart-level errors and warnings, merged with the errors and warnings of the matched cart line. */
  errors: ProductFormErrors;
  /** First cart line whose merchandise ID matches the selected variant, or `null` when no line matches. */
  matchedLineItem: CartLine | null;
}

/** Options array from the product form store state, typed to a specific product. */
export type ProductFormOptions<TProduct extends ProductInput = ProductInput> =
  ProductFormStoreState<ProductVariantFrom<TProduct>, ProductOptionValueFrom<TProduct>>["options"];

/**
 * Result that selecting an option returns.
 *
 * - `resolved`: a loaded variant matches the selection.
 * - `unresolved`: the selection is valid, but no loaded variant matches it yet.
 * - `invalid`: the product has no such option name or value, or no variant exists for the selection with that value.
 *
 * A complete selection returns `unresolved` when the product query result doesn't include the matching variant. Query the exact variant from the Storefront API with the returned selected options.
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

/** A selection result that's resolved or unresolved. */
export type ValidProductSelectionResult<TProduct extends ProductInput = ProductInput> = Exclude<
  VariantSelectionResult<ProductVariantFrom<TProduct>>,
  { status: "invalid" }
>;

/** Options for creating a product form store. */
export type CreateProductFormStoreOptions = {
  /** Fallback selection that the store uses when the product has no selected or first available variant. */
  selectedOptions?: SelectedOption[];
};

/** Manages variant selection and cart integration for a product form. */
export interface ProductFormStore<
  TProduct extends ProductInput = ProductInput,
  TVariant extends ProductVariantInput = ProductVariantFrom<TProduct>,
> {
  /** Returns the current state snapshot. */
  getState(): ProductFormStoreState<TVariant, ProductOptionValueFrom<TProduct>>;
  /** Registers a listener that runs on every state change and returns an unsubscribe function. */
  subscribe(
    listener: (state: ProductFormStoreState<TVariant, ProductOptionValueFrom<TProduct>>) => void,
  ): () => void;
  /**
   * Selects an option value and resolves the new variant.
   *
   * Resolved and unresolved selections update the store state. An invalid selection leaves the state unchanged and returns a reason. Build the next product URL from the selected options in the returned result.
   */
  selectOption(name: string, value: string): VariantSelectionResult<TVariant>;
  /**
   * Replaces the product data and recomputes the state. Create the store once and hydrate it each time the server reloads the product.
   *
   * The store keeps its subscribers and its cart subscription. The new selection comes from the product's selected or first available variant, then the selected options that you pass, then the current selection.
   */
  hydrate(product: TProduct, opts?: { selectedOptions?: SelectedOption[] }): void;
  /** Restores the product and the selection that the store started with. */
  reset(): void;
  /** Re-subscribes to the cart store and recomputes the cart errors and matched cart line. The store subscribes when you create it. Call this method only to reuse the store after you destroy it, such as in React Strict Mode effects. */
  connect(): void;
  /** Removes the cart subscription and clears the decoded variant cache. */
  destroy(): void;
  /** Passes a native submit event to the cart store's form handler, with the selected variant's details as the add-to-cart event detail. The cart adds a line when the submit button has no value and the form has a merchandise ID field. */
  handleFormSubmit(event: SubmitEvent): Promise<void>;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Finds the selected variant in the option state of a product form store.
 *
 * The product form store derives its selected variant with this function. Show the product's price range until the selection resolves to a variant. When every option has a selection and the result is `null`, query the exact variant from the Storefront API.
 *
 * @param options The options array from the product form store state.
 * @returns The selected variant, or `null` when the selection is partial or the query result doesn't include the variant.
 * @publicDocs
 */
export function getSelectedVariant<TVariant extends ProductVariantInput>(
  options: VariantOptionState<TVariant, ProductOptionValueInput>[],
): TVariant | null {
  return options[0]?.values.find((v) => v.selected)?.variant ?? null;
}

/**
 * Checks whether the customer can add the current selection to the cart.
 *
 * @param product The product data. A product that requires a selling plan always returns `false`.
 * @param options The options array from the product form store state.
 * @returns `true` when the selection resolves to a variant that's available for sale and the product doesn't require a selling plan.
 * @publicDocs
 */
export function canAddToCart<TProduct extends ProductInput>(
  product: TProduct,
  options: VariantOptionState<ProductVariantFrom<TProduct>, ProductOptionValueFrom<TProduct>>[],
): boolean {
  if (product.requiresSellingPlan) return false;
  const variant = getSelectedVariant(options);
  return variant !== null && variant.availableForSale;
}

/**
 * Finds the first cart line whose merchandise ID matches a variant ID.
 *
 * Several cart lines can share a merchandise ID when the lines have different selling plans or attributes. The function returns the first of those lines. The product form store derives its matched cart line with this function.
 *
 * @param lines The cart lines, such as `data.lines.nodes` from the cart store state.
 * @param merchandiseId The variant ID to match against the merchandise ID of each cart line.
 * @returns The first matching cart line, or `null` when no line matches.
 * @publicDocs
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
    typeof createObservable<
      ProductFormStoreState<ProductVariantFrom<TProduct>, ProductOptionValueFrom<TProduct>>
    >
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

/**
 * Creates a store that manages variant selection and cart integration for a product form.
 *
 * The store subscribes to the cart store to keep the cart errors and the matched cart line in sync. Destroy the store when the form unmounts to remove the subscription.
 *
 * The store computes option existence and availability from the product data without network requests. The store doesn't update the URL. Build the URL from the selection result.
 *
 * @param product The product data from your Storefront API query.
 * @param cartStore The cart store that supplies cart lines and errors and handles form submissions.
 * @param options The fallback selection to use when the product has no selected or first available variant.
 * @returns A product form store whose initial selection comes from the product's selected or first available variant, or else the fallback selection.
 * @example
 * ```ts
 * const store = createProductFormStore(product, cartStore);
 *
 * store.subscribe((state) => {
 *   console.log("selected variant:", state.selectedVariant);
 * });
 *
 * store.selectOption("Color", "Red");
 * ```
 * @publicDocs
 */
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
    connect: () => connect(context),
    destroy: () => destroy(context),
    handleFormSubmit: (event) => handleFormSubmit(context, event),
  };
}

// ---------------------------------------------------------------------------
// State builders
// ---------------------------------------------------------------------------

type VariantOnlyState<TProduct extends ProductInput> = {
  options: VariantOptionState<ProductVariantFrom<TProduct>, ProductOptionValueFrom<TProduct>>[];
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
): ProductFormStoreState<ProductVariantFrom<TProduct>, ProductOptionValueFrom<TProduct>> {
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

function connect<TProduct extends ProductInput>(context: ProductFormStoreContext<TProduct>): void {
  context.unsubCart();
  context.destroyed = false;
  context.unsubCart = context.cartStore.subscribe(() => {
    if (context.destroyed) return;
    syncFromCart(context);
  });
  syncFromCart(context);
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

  return {
    products: [
      {
        id: selectedVariant.id,
        title: selectedVariant.title,
        product: selectedVariant.product
          ? { title: selectedVariant.product.title, handle: selectedVariant.product.handle }
          : undefined,
        selectedOptions: selectedVariant.selectedOptions,
        image: selectedVariant.image,
        price: selectedVariant.price,
      },
    ],
  };
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
  prev: ProductFormStoreState<TVariant, ProductOptionValueInput>,
  next: ProductFormStoreState<TVariant, ProductOptionValueInput>,
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

/**
 * Creates a store that manages variant selection and cart integration for a product form.
 *
 * The store subscribes to the cart store to keep the cart errors and the matched cart line in sync. Destroy the store when the form unmounts to remove the subscription.
 *
 * The store computes option existence and availability from the product data without network requests. The store doesn't update the URL. Build the URL from the selection result.
 *
 * @example
 * ```ts
 * const store = createProductFormStore(product, cartStore);
 *
 * store.subscribe((state) => {
 *   console.log("selected variant:", state.selectedVariant);
 * });
 *
 * store.selectOption("Color", "Red");
 * ```
 * @publicDocs
 */
export type CreateProductFormStoreForDocs =
  /**
   * @param product - The product data from your Storefront API query.
   * @param cartStore - The cart store that supplies cart lines and errors and handles form submissions.
   * @param options - The fallback selection to use when the product has no selected or first available variant.
   * @returns A product form store whose initial selection comes from the product's selected or first available variant, or else the fallback selection.
   */
  (
    product: ProductInput,
    cartStore: CartStore,
    options?: CreateProductFormStoreOptions,
  ) => ProductFormStore;
