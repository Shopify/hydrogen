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
import {
  createProductFormRegister,
  createProductFormStore,
  type ProductFormErrors,
  type ProductFormRegister,
  type ProductFormStore,
  type ProductInput,
  type ProductVariantFrom,
  type VariantOptionState,
  type VariantSelectionResult,
} from "../core/product";
import { getCartEndpoint, useCartStore } from "./cart";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** A selection result that is not invalid — either resolved or unresolved. */
export type ValidProductSelectionResult<TProduct extends ProductInput> = Exclude<
  VariantSelectionResult<ProductVariantFrom<TProduct>>,
  { status: "invalid" }
>;

/** Options for {@link useProductForm}. */
export interface UseProductFormOptions<TProduct extends ProductInput> {
  onSelect?: (result: ValidProductSelectionResult<TProduct>) => void;
}

/** Return value of {@link useProductForm}. */
export interface UseProductFormResult<TProduct extends ProductInput> {
  options: VariantOptionState<ProductVariantFrom<TProduct>>[];
  selectedVariant: ProductVariantFrom<TProduct> | null;
  register: ProductFormRegister;
  formProps: (opts?: {
    beforeSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
    afterSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
  }) => FormHTMLAttributes<HTMLFormElement>;
  errors: ProductFormErrors;
  matchedLineItem: CartLine | null;
  pending: boolean;
  selectOption: (
    name: string,
    value: string,
  ) => VariantSelectionResult<ProductVariantFrom<TProduct>>;
}

/** Props for the `ProductProvider` returned by {@link createProductComponents}. */
export interface ProductProviderProps<TProduct extends ProductInput> {
  product: TProduct;
  onSelect?: (result: ValidProductSelectionResult<TProduct>) => void;
  children?: ReactNode;
}

/** Return value of the `useProduct` hook from {@link createProductComponents}. */
export interface UseProductResult<TProduct extends ProductInput> {
  options: VariantOptionState<ProductVariantFrom<TProduct>>[];
  selectedVariant: ProductVariantFrom<TProduct> | null;
  selectOption: (
    name: string,
    value: string,
  ) => VariantSelectionResult<ProductVariantFrom<TProduct>>;
  errors: ProductFormErrors;
  matchedLineItem: CartLine | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Standalone hook
// ---------------------------------------------------------------------------

/**
 * Subscribes to a {@link ProductFormStore} and returns form-ready state.
 *
 * This is a pure subscription hook — it does **not** manage store lifecycle.
 * Create the store with `createProductFormStore` and manage its lifecycle
 * (hydration, destruction) yourself, or use `createProductComponents` for a
 * provider-based approach.
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
              console.error("[hydrogen] form submission error:", error);
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
 * Creates a typed set of product components bound to a specific product type.
 *
 * Returns `{ ProductProvider, useProduct, useProductForm }` where:
 * - `ProductProvider` manages store lifecycle (creation, hydration, cleanup)
 * - `useProduct` provides read-only state and variant selection
 * - `useProductForm` provides form-binding utilities (register, formProps, pending)
 *
 * Requires a `<CartProvider>` ancestor.
 *
 * @example
 * ```ts
 * const { ProductProvider, useProduct, useProductForm } =
 *   createProductComponents<MyProductType>();
 * ```
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
    const cartStore = useCartStore();

    // oxlint-disable-next-line react-hooks/exhaustive-deps -- store is intentionally created once
    const store = useMemo(() => createProductFormStore<TProduct>(product, cartStore), []);

    useEffect(() => () => store.destroy(), [store]);

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
