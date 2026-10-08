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
 * Cart errors and warnings to show near the add-to-cart button.
 *
 * Each list starts with cart-level messages, followed by the messages for the cart line that holds the selected variant.
 */
export interface ProductFormErrors {
  /** User errors for the cart, then for the cart line that holds the selected variant. */
  userErrors: CartUserError[];
  /** Warnings for the cart, then for the cart line that holds the selected variant. */
  warnings: CartWarning[];
  /** Failed cart requests. Each entry has a message and, when available, an HTTP status. */
  networkErrors: CartNetworkEntry[];
}

/** The product form's option state, selection, cart errors, and matching cart line. */
export interface ProductFormStoreState<
  TVariant extends ProductVariantInput = ProductVariantInput,
  TOptionValue extends ProductOptionValueInput = ProductOptionValueInput,
> {
  /** Each product option and its values, with the selection, existence, and availability of each value. */
  options: VariantOptionState<TVariant, TOptionValue>[];
  /** Option names and values in the current selection, which can be partial. */
  selectedOptions: SelectedOption[];
  /** Variant that matches the current selection, or `null` when the selection is partial or your query didn't load that variant. */
  selectedVariant: TVariant | null;
  /** Cart errors and warnings to show near the add-to-cart button. */
  errors: ProductFormErrors;
  /** First cart line that holds the selected variant, or `null` when no cart line holds the variant. */
  matchedLineItem: CartLine | null;
}

/** Option state from the product form, typed to your product query. */
export type ProductFormOptions<TProduct extends ProductInput = ProductInput> =
  ProductFormStoreState<ProductVariantFrom<TProduct>, ProductOptionValueFrom<TProduct>>["options"];

/**
 * Result of selecting an option value. Build the next product URL from the selected options in the result.
 *
 * - `resolved`: the selection matches a variant that your query loaded.
 * - `unresolved`: the selection is valid, but your query didn't load a matching variant.
 * - `invalid`: the product has no such option name or value, or no variant combines the value with the rest of the selection.
 *
 * When a complete selection returns `unresolved`, query the exact variant from the Storefront API with the returned selected options.
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

/** A selection result with a `resolved` or `unresolved` status. Selection callbacks receive this result. */
export type ValidProductSelectionResult<TProduct extends ProductInput = ProductInput> = Exclude<
  VariantSelectionResult<ProductVariantFrom<TProduct>>,
  { status: "invalid" }
>;

/** Options for creating a product form store. */
export type CreateProductFormStoreOptions = {
  /** Selection to start from when the product has no selected or first available variant. */
  selectedOptions?: SelectedOption[];
};

/** Tracks the customer's option selection for one product and adds the selected variant to the cart. */
export interface ProductFormStore<
  TProduct extends ProductInput = ProductInput,
  TVariant extends ProductVariantInput = ProductVariantFrom<TProduct>,
> {
  /** Returns the current product form state. */
  getState(): ProductFormStoreState<TVariant, ProductOptionValueFrom<TProduct>>;
  /** Calls the listener on every state change. Returns a function that unsubscribes the listener. */
  subscribe(
    listener: (state: ProductFormStoreState<TVariant, ProductOptionValueFrom<TProduct>>) => void,
  ): () => void;
  /**
   * Selects an option value and returns the result.
   *
   * Resolved and unresolved selections update the state. An invalid selection leaves the state unchanged and returns a reason. Build the next product URL from the selected options in the result.
   */
  selectOption(name: string, value: string): VariantSelectionResult<TVariant>;
  /**
   * Loads new product data into the store. Create the store once and call `hydrate()` each time the server reloads the product.
   *
   * The store keeps its subscribers. The new selection comes from the product's selected or first available variant, then from the selected options that you pass, then from the current selection.
   */
  hydrate(product: TProduct, opts?: { selectedOptions?: SelectedOption[] }): void;
  /** Restores the product data and the selection that the store started with. */
  reset(): void;
  /** Reconnects the store to the cart after you call `destroy()`, such as in React Strict Mode effects. The store connects to the cart when you create it. */
  connect(): void;
  /** Disconnects the store from the cart. Call `destroy()` when the product form unmounts. */
  destroy(): void;
  /**
   * Adds the selected variant to the cart from the product form's native submit event.
   *
   * The cart adds the variant when the clicked button has no value and the form includes a merchandise ID field. The cart uses the variant's title, image, and price to show the change before the server responds. The returned promise rejects when the event target isn't a form or the event has no submitter.
   */
  handleFormSubmit(event: SubmitEvent): Promise<void>;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Returns the variant that matches the customer's current option selection.
 *
 * Show the product's price range until the selection resolves to a variant. When every option has a selection and the function returns `null`, query the exact variant from the Storefront API.
 *
 * @param options The `options` array from the product form state.
 * @returns The matching variant, or `null` when the selection is partial or your query didn't load that variant.
 * @publicDocs
 */
export function getSelectedVariant<TVariant extends ProductVariantInput>(
  options: VariantOptionState<TVariant, ProductOptionValueInput>[],
): TVariant | null {
  return options[0]?.values.find((v) => v.selected)?.variant ?? null;
}

/**
 * Checks whether the customer can add the current selection to the cart. Use the result to enable or disable the add-to-cart button.
 *
 * @param product The product from your query. A product that requires a selling plan always returns `false`.
 * @param options The `options` array from the product form state.
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
 * Finds the cart line that holds a variant. Use the line to show the quantity that's already in the cart.
 *
 * When several cart lines hold the variant with different selling plans or attributes, the function returns the first line.
 *
 * @param lines The cart lines, such as `data.lines.nodes` from the cart state.
 * @param merchandiseId The variant ID to look for.
 * @returns The first cart line that holds the variant, or `null` when no cart line holds the variant.
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
 * Creates a store that tracks the customer's option selection for one product and adds the selected variant to the cart.
 *
 * The store resolves variants from the product data that you pass and leaves the URL to you. Build the product URL from the result of `selectOption()`. Call `destroy()` when the product form unmounts. The product provider from `createProductComponents` creates and destroys the store for you.
 *
 * @param product The product from your Storefront API query.
 * @param cartStore The cart store that the form adds variants to and reads cart errors from.
 * @param options The selection to start from when the product has no selected or first available variant.
 * @returns A product form store. The starting selection comes from the product's selected or first available variant, or else from the selection in the options.
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
 * Creates a store that tracks the customer's option selection for one product and adds the selected variant to the cart.
 *
 * The store resolves variants from the product data that you pass and leaves the URL to you. Build the product URL from the result of `selectOption()`. Call `destroy()` when the product form unmounts. The product provider from `createProductComponents` creates and destroys the store for you.
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
   * @param product - The product from your Storefront API query.
   * @param cartStore - The cart store that the form adds variants to and reads cart errors from.
   * @param options - The selection to start from when the product has no selected or first available variant.
   * @returns A product form store. The starting selection comes from the product's selected or first available variant, or else from the selection in the options.
   */
  (
    product: ProductInput,
    cartStore: CartStore,
    options?: CreateProductFormStoreOptions,
  ) => ProductFormStore;
