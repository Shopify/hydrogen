import {
  createProductFormRegister,
  createProductFormStore,
  type CartLine,
  type ProductFormErrors,
  type ProductFormRegister,
  type ProductFormStore,
  type ProductVariantFrom,
  type VariantOptionState,
  type VariantSelectionResult,
} from "@shopify/hydrogen";
import {
  inject,
  onScopeDispose,
  onUnmounted,
  provide,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from "vue";

import { getCartEndpoint, useCartStore } from "./cart";

export interface ProductVariantData {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
  price: { amount: string; currencyCode: string };
  compareAtPrice: { amount: string; currencyCode: string } | null;
  image: {
    id: string;
    url: string;
    altText: string | null;
    width: number;
    height: number;
  } | null;
  product: { title: string; handle: string };
  sku: string | null;
}

export interface ProductData {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  description: string;
  requiresSellingPlan: boolean;
  encodedVariantExistence: string;
  encodedVariantAvailability: string;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  images: { nodes: { url: string; altText: string | null }[] };
  options: {
    name: string;
    optionValues: {
      name: string;
      firstSelectableVariant: ProductVariantData | null;
      swatch: {
        color: string | null;
        image: { previewImage: { url: string } } | null;
      } | null;
    }[];
  }[];
  selectedOrFirstAvailableVariant: ProductVariantData | null;
  adjacentVariants: ProductVariantData[];
}

export type ValidProductSelectionResult = Exclude<
  VariantSelectionResult<ProductVariantFrom<ProductData>>,
  { status: "invalid" }
>;

export type ProductForm = {
  options: VariantOptionState<ProductVariantData>[];
  selectedVariant: ProductVariantData | null;
  register: ProductFormRegister;
  formProps: (opts?: {
    beforeSubmit?: (e: Event) => void;
    afterSubmit?: (e: Event) => void;
  }) => Record<string, unknown>;
  errors: ProductFormErrors;
  matchedLineItem: CartLine | null;
  pending: Readonly<Ref<boolean>>;
  selectOption: (name: string, value: string) => VariantSelectionResult<ProductVariantData>;
};

const productFormKey = Symbol("NuxtProductForm");

type ProductFormContext = {
  store: ProductFormStore<ProductData>;
  getOnSelect: () => ((result: ValidProductSelectionResult) => void) | undefined;
};

export function provideProductForm(
  product: Ref<ProductData> | ComputedRef<ProductData>,
  options?: { onSelect?: (result: ValidProductSelectionResult) => void },
): void {
  const cartStore = useCartStore();
  const store = createProductFormStore<ProductData>(product.value, cartStore);
  provide(productFormKey, {
    store,
    getOnSelect: () => options?.onSelect,
  } satisfies ProductFormContext);

  let mounted = false;
  watch(
    () => `${product.value.id}:${product.value.selectedOrFirstAvailableVariant?.id ?? ""}`,
    () => {
      if (!mounted) {
        mounted = true;
        return;
      }
      store.hydrate(product.value);
    },
    { immediate: true },
  );

  onUnmounted(() => {
    store.destroy();
  });
}

export function useProductForm(): ProductForm {
  const ctx = inject<ProductFormContext | null>(productFormKey, null);
  if (!ctx) throw new Error("useProductForm must be used after provideProductForm().");
  const context = ctx;
  const state = shallowRef(ctx.store.getState());
  const pending = shallowRef(false);

  const unsubscribe = context.store.subscribe(() => {
    state.value = context.store.getState();
  });
  onScopeDispose(unsubscribe);

  function selectOption(name: string, value: string): VariantSelectionResult<ProductVariantData> {
    const result = context.store.selectOption(name, value);
    if (result.status !== "invalid") {
      context.getOnSelect()?.(result as ValidProductSelectionResult);
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
        context.store
          .handleFormSubmit(e as SubmitEvent)
          .then(
            () => opts?.afterSubmit?.(e),
            (error: unknown) => {
              console.error("[hydrogen] product form submission error:", error);
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
