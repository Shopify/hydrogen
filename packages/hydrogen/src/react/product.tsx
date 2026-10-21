"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormHTMLAttributes,
  type ReactNode,
  type SubmitEvent,
} from "react";

import type { CartLine } from "../core/cart/state";
import { getLogger } from "../core/logging";
import {
  createProductFormRegister,
  createProductFormStore,
  type ProductFormErrors,
  type ProductFormOptions,
  type ProductFormRegister,
  type ProductFormStore,
  type ProductInput,
  type ProductVariantFrom,
  type ValidProductSelectionResult,
  type VariantSelectionResult,
} from "../core/product";
import { getCartEndpoint, useCartStore } from "./cart";

const log = getLogger("product");

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type { ValidProductSelectionResult } from "../core/product";

/** Options for the `useProductForm` hook. */
export interface UseProductFormOptions<TProduct extends ProductInput> {
  /** Runs after each resolved or unresolved selection. Invalid selections skip the callback. */
  onSelect?: (result: ValidProductSelectionResult<TProduct>) => void;
}

/** Product form state and bindings that the product form hooks return. */
export interface UseProductFormResult<TProduct extends ProductInput> {
  /** Each product option and its values, with the selection, existence, and availability of each value. */
  options: ProductFormOptions<TProduct>;
  /** Variant that matches the current selection, or `null` when the selection is partial or your query didn't load that variant. */
  selectedVariant: ProductVariantFrom<TProduct> | null;
  /** Returns the props for a product form field. Spread the props on the matching input or button. */
  register: ProductFormRegister;
  /**
   * Returns props for the product form element. Submitting the form adds the selected variant to the cart, and the form posts to the cart endpoint before JavaScript loads.
   * Call `preventDefault()` in `beforeSubmit` to cancel the submission. The `afterSubmit` callback runs after the cart store handles the submission. Cart errors appear in the errors field. When the cart store throws an error, the hook logs the error and skips `afterSubmit`.
   */
  formProps: (opts?: {
    beforeSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
    afterSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
  }) => FormHTMLAttributes<HTMLFormElement>;
  /** Cart errors and warnings to show near the add-to-cart button. */
  errors: ProductFormErrors;
  /** First cart line that holds the selected variant, or `null` when no cart line holds the variant. */
  matchedLineItem: CartLine | null;
  /**
   * Whether the cart is handling a form submission. Disable the add-to-cart button while the value is `true`.
   */
  pending: boolean;
  /** Selects an option value and returns the result. Resolved and unresolved selections run the `onSelect` callback. */
  selectOption: (
    name: string,
    value: string,
  ) => VariantSelectionResult<ProductVariantFrom<TProduct>>;
}

/** Props for the product provider from `createProductComponents`. */
export interface ProductProviderProps<TProduct extends ProductInput> {
  /**
   * The product from your Storefront API query.
   * The provider reloads the product into the store when the product ID or the selected or first available variant ID changes. The customer's selection persists through re-renders that keep both IDs.
   */
  product: TProduct;
  /**
   * Runs after each resolved or unresolved selection. Invalid selections skip the callback. Navigate to the new product URL in this callback, and keep navigation out of option controls.
   * Make the callback safe to run twice. A click on a hydrated option link runs the callback and also follows the link.
   */
  onSelect?: (result: ValidProductSelectionResult<TProduct>) => void;
  /** Content that reads product state through the product hooks. */
  children?: ReactNode;
}

/** Product state that the `useProduct` hook from `createProductComponents` returns. */
export interface UseProductResult<TProduct extends ProductInput> {
  /** Each product option and its values, with the selection, existence, and availability of each value. */
  options: ProductFormOptions<TProduct>;
  /** Variant that matches the current selection, or `null` when the selection is partial or your query didn't load that variant. */
  selectedVariant: ProductVariantFrom<TProduct> | null;
  /** Selects an option value and returns the result. Resolved and unresolved selections run the `onSelect` callback. */
  selectOption: (
    name: string,
    value: string,
  ) => VariantSelectionResult<ProductVariantFrom<TProduct>>;
  /** Cart errors and warnings to show near the add-to-cart button. */
  errors: ProductFormErrors;
  /** First cart line that holds the selected variant, or `null` when no cart line holds the variant. */
  matchedLineItem: CartLine | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Standalone hook
// ---------------------------------------------------------------------------

/**
 * Returns product form state and bindings from a product form store that you manage, and re-renders when the state changes.
 *
 * Create the store with `createProductFormStore`. Call `connect()` on mount, `hydrate()` when the product data changes, and `destroy()` on unmount. To skip the store setup, use the product provider from `createProductComponents`.
 *
 * @param store The store that `createProductFormStore` returns.
 * @param options An `onSelect` callback that runs after each resolved or unresolved selection.
 * @returns The option state, the selected variant, cart errors, the matching cart line, the pending state, the register function, and the form props.
 * @publicDocs
 */
export function useProductForm<TProduct extends ProductInput>(
  store: ProductFormStore<TProduct>,
  options?: UseProductFormOptions<TProduct>,
): UseProductFormResult<TProduct> {
  const onSelectRef = useRef(options?.onSelect);
  onSelectRef.current = options?.onSelect;

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [pending, setPending] = useState(false);

  const selectOption = useCallback(
    (name: string, value: string) => {
      const result = store.selectOption(name, value);
      if (result.status !== "invalid") {
        onSelectRef.current?.(result);
      }
      return result;
    },
    [store],
  );

  // oxlint-disable-next-line react-hooks/exhaustive-deps -- state is the full reactive snapshot; selectOption is stable
  const register = useMemo(
    () => createProductFormRegister(state.selectedVariant, selectOption),
    [state, selectOption],
  );

  const formProps = useCallback(
    (opts?: {
      beforeSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
      afterSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
    }): FormHTMLAttributes<HTMLFormElement> => ({
      onSubmit: (e: SubmitEvent<HTMLFormElement>) => {
        opts?.beforeSubmit?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        setPending(true);
        store
          .handleFormSubmit(e.nativeEvent)
          .then(
            () => opts?.afterSubmit?.(e),
            (error: unknown) => {
              // Cart user/network errors are surfaced via the reactive `errors`
              // state. Thrown exceptions (missing Shopify script, invalid form
              // target) are programming errors — log them for dev visibility.
              log.error("form submission error", { error });
            },
          )
          .finally(() => setPending(false));
      },
      method: "post",
      action: getCartEndpoint(),
    }),
    [store],
  );

  return {
    options: state.options,
    selectedVariant: state.selectedVariant,
    register,
    formProps,
    errors: state.errors,
    matchedLineItem: state.matchedLineItem,
    pending,
    selectOption,
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

interface ProductContextValue<TProduct extends ProductInput> {
  store: ProductFormStore<TProduct>;
  onSelectRef: React.RefObject<
    ((result: ValidProductSelectionResult<TProduct>) => void) | undefined
  >;
}

/**
 * Creates a product provider and product hooks typed to your product query.
 *
 * The provider creates the product form store, reloads the product into the store when the product changes, and destroys the store on unmount. The `useProduct` hook returns the option state and variant selection. The `useProductForm` hook adds field props, form props, and the pending state.
 *
 * Pass your Storefront API product query type as the type argument to type the selected variant and option values. Render the provider inside a cart provider. The provider throws an error without a cart provider ancestor, and each hook throws an error outside the product provider.
 *
 * @returns The typed `ProductProvider` component and the `useProduct` and `useProductForm` hooks.
 *
 * @example
 * ```ts
 * const { ProductProvider, useProduct, useProductForm } =
 *   createProductComponents<MyProductType>();
 * ```
 * @publicDocs
 */
export function createProductComponents<TProduct extends ProductInput>(): {
  ProductProvider: (props: ProductProviderProps<TProduct>) => ReactNode;
  useProduct: () => UseProductResult<TProduct>;
  useProductForm: () => UseProductFormResult<TProduct>;
} {
  const Context = createContext<ProductContextValue<TProduct> | null>(null);

  function useProductContext(hookName: string): ProductContextValue<TProduct> {
    const ctx = useContext(Context);
    if (!ctx) {
      throw new Error(
        `${hookName} must be used inside a <ProductProvider>. ` +
          "Wrap your component tree with the ProductProvider from createProductComponents(), " +
          "or use the standalone useProductForm(store) hook instead.",
      );
    }
    return ctx;
  }

  function ProductProvider({ product, onSelect, children }: ProductProviderProps<TProduct>) {
    const cartStore = useCartStore("ProductProvider");

    // oxlint-disable-next-line react-hooks/exhaustive-deps -- store is intentionally created once
    const store = useMemo(() => createProductFormStore<TProduct>(product, cartStore), []);

    useEffect(() => {
      store.connect();
      return () => store.destroy();
    }, [store]);

    const productKey = `${product.id}:${product.selectedOrFirstAvailableVariant?.id ?? ""}`;
    const mountedRef = useRef(false);
    useEffect(() => {
      if (!mountedRef.current) {
        mountedRef.current = true;
        return;
      }
      store.hydrate(product);
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- productKey is the semantic dep
    }, [productKey]);

    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    // oxlint-disable-next-line react-hooks/exhaustive-deps -- onSelectRef is a stable ref object
    const value = useMemo<ProductContextValue<TProduct>>(() => ({ store, onSelectRef }), [store]);

    return createElement(Context.Provider, { value }, children);
  }

  function useProductHook(): UseProductResult<TProduct> {
    const { store, onSelectRef } = useProductContext("useProduct");
    const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

    const selectOption = useCallback(
      (name: string, value: string) => {
        const result = store.selectOption(name, value);
        if (result.status !== "invalid") {
          onSelectRef.current?.(result);
        }
        return result;
      },
      [store, onSelectRef],
    );

    return {
      options: state.options,
      selectedVariant: state.selectedVariant,
      selectOption,
      errors: state.errors,
      matchedLineItem: state.matchedLineItem,
    };
  }

  function useProductFormHook(): UseProductFormResult<TProduct> {
    const { store, onSelectRef } = useProductContext("useProductForm");
    return useProductForm<TProduct>(store, { onSelect: onSelectRef.current });
  }

  return {
    ProductProvider,
    useProduct: useProductHook,
    useProductForm: useProductFormHook,
  };
}

/**
 * Returns product form state and bindings from a product form store that you manage, and re-renders when the state changes.
 *
 * Create the store with `createProductFormStore`. Call `connect()` on mount, `hydrate()` when the product data changes, and `destroy()` on unmount. To skip the store setup, use the product provider from `createProductComponents`.
 *
 * @publicDocs
 */
export type UseProductFormForDocs =
  /**
   * @param store - The store that `createProductFormStore` returns.
   * @param options - An `onSelect` callback that runs after each resolved or unresolved selection.
   * @returns The option state, the selected variant, cart errors, the matching cart line, the pending state, the register function, and the form props.
   */
  (
    store: ProductFormStore,
    options?: UseProductFormOptions<ProductInput>,
  ) => UseProductFormResult<ProductInput>;
