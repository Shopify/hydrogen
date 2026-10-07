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

/** Options for the standalone product form hook. */
export interface UseProductFormOptions<TProduct extends ProductInput> {
  /** Runs after each resolved or unresolved option selection. Invalid selections skip the callback. */
  onSelect?: (result: ValidProductSelectionResult<TProduct>) => void;
}

/** Return value of the product form hooks. */
export interface UseProductFormResult<TProduct extends ProductInput> {
  /** The product's options, with each value's selection, existence, and availability for the current selection. */
  options: ProductFormOptions<TProduct>;
  /** Variant for the current selection, or `null` when the selection is partial or the query result doesn't include the variant. */
  selectedVariant: ProductVariantFrom<TProduct> | null;
  /** Returns props for a product form field. The hook creates a new register function each time the store state changes. */
  register: ProductFormRegister;
  /**
   * Returns form attributes that post to the cart endpoint and add the selected variant on submit.
   * A `beforeSubmit` callback that prevents the default action cancels the submission. The `afterSubmit` callback runs after the cart store's form handler resolves. A rejected submission logs an error and skips the callback.
   */
  formProps: (opts?: {
    beforeSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
    afterSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
  }) => FormHTMLAttributes<HTMLFormElement>;
  /** Cart-level errors and warnings, merged with the errors and warnings of the matched cart line. */
  errors: ProductFormErrors;
  /** First cart line whose merchandise ID matches the selected variant, or `null` when no line matches. */
  matchedLineItem: CartLine | null;
  /**
   * Whether a form submission is in flight. Disable the submit button while the value is `true`.
   */
  pending: boolean;
  /** Selects an option value and returns the selection result. Valid selections call the `onSelect` callback. */
  selectOption: (
    name: string,
    value: string,
  ) => VariantSelectionResult<ProductVariantFrom<TProduct>>;
}

/** Props for the product provider that the product components factory returns. */
export interface ProductProviderProps<TProduct extends ProductInput> {
  /**
   * The product that the provider's store manages. The provider connects the store on mount and destroys the store on unmount.
   * The provider rehydrates the store when the product ID or the selected or first available variant ID changes. Customer selections persist through re-renders that keep both IDs.
   */
  product: TProduct;
  /**
   * Runs after each resolved or unresolved selection. Invalid selections skip the callback. Put URL navigation in this callback, and keep navigation logic out of option controls.
   * Make the callback idempotent. A hydrated click on an option link runs the callback and also follows the link.
   */
  onSelect?: (result: ValidProductSelectionResult<TProduct>) => void;
  /** Content that reads product state through the product hooks. */
  children?: ReactNode;
}

/** Return value of the product state hook that the product components factory returns. */
export interface UseProductResult<TProduct extends ProductInput> {
  /** The product's options, with each value's selection, existence, and availability for the current selection. */
  options: ProductFormOptions<TProduct>;
  /** Variant for the current selection, or `null` when the selection is partial or the query result doesn't include the variant. */
  selectedVariant: ProductVariantFrom<TProduct> | null;
  /** Selects an option value and returns the selection result. Valid selections call the `onSelect` callback. */
  selectOption: (
    name: string,
    value: string,
  ) => VariantSelectionResult<ProductVariantFrom<TProduct>>;
  /** Cart-level errors and warnings, merged with the errors and warnings of the matched cart line. */
  errors: ProductFormErrors;
  /** First cart line whose merchandise ID matches the selected variant, or `null` when no line matches. */
  matchedLineItem: CartLine | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Standalone hook
// ---------------------------------------------------------------------------

/**
 * Returns form state from a product form store and re-renders on each store change.
 *
 * The hook subscribes to the store and leaves the store lifecycle to you. Create the store with createProductFormStore. Connect the store on mount, hydrate the store when the product data changes, and destroy the store on unmount. For a provider that manages the store, use createProductComponents.
 *
 * @param store The product form store that createProductFormStore returns.
 * @param options Options with an `onSelect` callback for each valid option selection.
 * @returns Option state, the selected variant, cart errors, the matched cart line, pending state, and form bindings.
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
 * Returns a product provider and hooks typed to your product query.
 *
 * The provider creates a product form store, hydrates the store when the product changes, and destroys the store on unmount. The product hook returns option state and variant selection. The form hook adds field registration, form props, and pending state.
 *
 * Pass your Storefront API product query type as the type argument to type the selected variant and option values. The provider throws an error without a cart provider ancestor. Each hook throws an error outside the product provider.
 *
 * @returns The typed product provider, the product state hook, and the product form hook.
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
 * Returns form state from a product form store and re-renders on each store change.
 *
 * The hook subscribes to the store and leaves the store lifecycle to you. Create the store with createProductFormStore. Connect the store on mount, hydrate the store when the product data changes, and destroy the store on unmount. For a provider that manages the store, use createProductComponents.
 *
 * @publicDocs
 */
export type UseProductFormForDocs =
  /**
   * @param store - The product form store that createProductFormStore returns.
   * @param options - Options with an `onSelect` callback for each valid option selection.
   * @returns Option state, the selected variant, cart errors, the matching cart line, pending state, and form bindings.
   */
  (
    store: ProductFormStore,
    options?: UseProductFormOptions<ProductInput>,
  ) => UseProductFormResult<ProductInput>;
