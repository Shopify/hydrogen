import {
  defineComponent,
  inject,
  onScopeDispose,
  onUnmounted,
  provide,
  shallowRef,
  watch,
  type InjectionKey,
  type PropType,
  type ShallowRef,
} from "vue";

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

export type ValidProductSelectionResult<TProduct extends ProductInput> = Exclude<
  VariantSelectionResult<ProductVariantFrom<TProduct>>,
  { status: "invalid" }
>;

export interface UseProductFormOptions<TProduct extends ProductInput> {
  onSelect?: (result: ValidProductSelectionResult<TProduct>) => void;
}

export interface UseProductFormResult<TProduct extends ProductInput> {
  options: VariantOptionState<ProductVariantFrom<TProduct>>[];
  selectedVariant: ProductVariantFrom<TProduct> | null;
  register: ProductFormRegister;
  formProps: (opts?: {
    beforeSubmit?: (e: Event) => void;
    afterSubmit?: (e: Event) => void;
  }) => Record<string, unknown>;
  errors: ProductFormErrors;
  matchedLineItem: CartLine | null;
  pending: ShallowRef<boolean>;
  selectOption: (
    name: string,
    value: string,
  ) => VariantSelectionResult<ProductVariantFrom<TProduct>>;
}

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

interface ProductContextValue<TProduct extends ProductInput> {
  store: ProductFormStore<TProduct>;
  getOnSelect: () => ((result: ValidProductSelectionResult<TProduct>) => void) | undefined;
}

/**
 * Shared implementation backing both the standalone composable and the factory
 * composable. Accepts a `getOnSelect` getter so the factory version can always
 * read the latest provider prop, while the standalone version captures the
 * caller's callback at setup time.
 */
function useProductFormImpl<TProduct extends ProductInput>(
  store: ProductFormStore<TProduct>,
  getOnSelect: () => ((result: ValidProductSelectionResult<TProduct>) => void) | undefined,
): UseProductFormResult<TProduct> {
  const state = shallowRef(store.getState());
  const pending = shallowRef(false);

  const unsubscribe = store.subscribe(() => {
    state.value = store.getState();
  });
  onScopeDispose(unsubscribe);

  function selectOption(
    name: string,
    value: string,
  ): VariantSelectionResult<ProductVariantFrom<TProduct>> {
    const result = store.selectOption(name, value);
    if (result.status !== "invalid") {
      getOnSelect()?.(result);
    }
    return result;
  }

  function formProps(opts?: {
    beforeSubmit?: (e: Event) => void;
    afterSubmit?: (e: Event) => void;
  }): Record<string, unknown> {
    return {
      onSubmit: (e: Event) => {
        opts?.beforeSubmit?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        pending.value = true;
        store
          .handleFormSubmit(e as SubmitEvent)
          .then(
            () => opts?.afterSubmit?.(e),
            (error: unknown) => {
              console.error("[hydrogen] form submission error:", error);
            },
          )
          .finally(() => {
            pending.value = false;
          });
      },
      method: "post",
      action: getCartEndpoint(),
    };
  }

  return {
    get options() {
      return state.value.options;
    },
    get selectedVariant() {
      return state.value.selectedVariant;
    },
    get register() {
      return createProductFormRegister(state.value.selectedVariant, selectOption);
    },
    formProps,
    get errors() {
      return state.value.errors;
    },
    get matchedLineItem() {
      return state.value.matchedLineItem;
    },
    pending,
    selectOption,
  };
}

// ---------------------------------------------------------------------------
// Standalone composable
// ---------------------------------------------------------------------------

/**
 * Subscribes to a {@link ProductFormStore} and returns form-ready state.
 *
 * This is a pure subscription composable — it does **not** manage store
 * lifecycle. Create the store with `createProductFormStore` and manage its
 * lifecycle (hydration, destruction) yourself, or use
 * `createProductComponents` for a provider-based approach.
 */
export function useProductForm<TProduct extends ProductInput>(
  store: ProductFormStore<TProduct>,
  options?: UseProductFormOptions<TProduct>,
): UseProductFormResult<TProduct> {
  const onSelect = options?.onSelect;
  return useProductFormImpl(store, () => onSelect);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a typed set of product components bound to a specific product type.
 *
 * Returns `{ ProductProvider, useProduct, useProductForm }` where:
 * - `ProductProvider` manages store lifecycle (creation, hydration, cleanup)
 * - `useProduct` provides read-only state and variant selection
 * - `useProductForm` provides form-binding utilities (register, formProps, pending)
 *
 * Requires a `<CartProvider>` ancestor.
 */
export function createProductComponents<TProduct extends ProductInput>(): {
  ProductProvider: ReturnType<typeof defineComponent>;
  useProduct: () => UseProductResult<TProduct>;
  useProductForm: () => UseProductFormResult<TProduct>;
} {
  const ProductStoreKey: InjectionKey<ProductContextValue<TProduct>> = Symbol("ProductFormStore");

  function useProductContext(composableName: string): ProductContextValue<TProduct> {
    const ctx = inject(ProductStoreKey);
    if (!ctx) {
      throw new Error(
        `${composableName} must be used inside a <ProductProvider>. ` +
          "Wrap your component tree with the ProductProvider from createProductComponents(), " +
          "or use the standalone useProductForm(store) composable instead.",
      );
    }
    return ctx;
  }

  const ProductProvider = defineComponent({
    name: "ProductProvider",
    props: {
      product: {
        type: Object as PropType<TProduct>,
        required: true,
      },
      onSelect: {
        type: Function as PropType<(result: ValidProductSelectionResult<TProduct>) => void>,
        default: undefined,
      },
    },
    setup(props, { slots }) {
      const product = props.product as TProduct;
      const cartStore = useCartStore();
      const store = createProductFormStore<TProduct>(product, cartStore);

      provide(ProductStoreKey, {
        store,
        getOnSelect: () =>
          props.onSelect as ((result: ValidProductSelectionResult<TProduct>) => void) | undefined,
      });

      let mounted = false;
      watch(
        () => {
          const p = props.product as TProduct;
          return `${p.id}:${p.selectedOrFirstAvailableVariant?.id ?? ""}`;
        },
        () => {
          if (!mounted) {
            mounted = true;
            return;
          }
          store.hydrate(props.product as TProduct);
        },
        { immediate: true },
      );

      onUnmounted(() => store.destroy());

      return () => slots.default?.();
    },
  });

  function useProduct(): UseProductResult<TProduct> {
    const ctx = useProductContext("useProduct");
    const state = shallowRef(ctx.store.getState());

    const unsubscribe = ctx.store.subscribe(() => {
      state.value = ctx.store.getState();
    });
    onScopeDispose(unsubscribe);

    function selectOption(
      name: string,
      value: string,
    ): VariantSelectionResult<ProductVariantFrom<TProduct>> {
      const result = ctx.store.selectOption(name, value);
      if (result.status !== "invalid") {
        ctx.getOnSelect()?.(result);
      }
      return result;
    }

    return {
      get options() {
        return state.value.options;
      },
      get selectedVariant() {
        return state.value.selectedVariant;
      },
      selectOption,
      get errors() {
        return state.value.errors;
      },
      get matchedLineItem() {
        return state.value.matchedLineItem;
      },
    };
  }

  function useProductFormHook(): UseProductFormResult<TProduct> {
    const ctx = useProductContext("useProductForm");
    return useProductFormImpl(ctx.store, ctx.getOnSelect);
  }

  return {
    ProductProvider,
    useProduct,
    useProductForm: useProductFormHook,
  };
}
