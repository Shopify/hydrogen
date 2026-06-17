import { canAddToCart, createProductFormRegister, createProductFormStore } from "@shopify/hydrogen";
import { useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";

import { getCartStore } from "../lib/cart";
import { openCartDrawer } from "../lib/cart-drawer";
import { formatMoney } from "../lib/money";
import type { ProductData, ProductFormState, ValidProductSelectionResult } from "../lib/product";
import { ShopPayButton } from "./ShopPayButton";

const SWATCHES: Record<string, string> = {
  Green: "#7ea993",
  Clay: "#7d6635",
  Ocean: "#5b8aa6",
  Purple: "#5e4a8a",
  Red: "#a26a72",
};

function isColor(name: string): boolean {
  return name.toLowerCase() === "color";
}

export function ProductPurchasePanel(props: { product: ProductData }) {
  const navigate = useNavigate();
  const location = useLocation();
  const store = createProductFormStore<ProductData>(props.product, getCartStore());
  const [formState, setFormState] = createSignal<ProductFormState>(store.getState());
  const [quantity, setQuantity] = createSignal(1);
  const [pending, setPending] = createSignal(false);
  let mounted = false;

  const unsubscribe = store.subscribe((nextState) => setFormState(nextState));
  onCleanup(() => {
    unsubscribe();
    store.destroy();
  });

  createEffect(() => {
    const identity = `${props.product.id}:${props.product.selectedOrFirstAvailableVariant?.id ?? ""}`;
    if (!mounted) {
      mounted = true;
      void identity;
      return;
    }
    store.hydrate(props.product);
  });

  const register = createMemo(() =>
    createProductFormRegister(formState().selectedVariant, selectOption),
  );
  const addable = createMemo(() => canAddToCart(props.product, formState().options));

  function selectOption(name: string, value: string) {
    const result = store.selectOption(name, value);
    if (result.status !== "invalid") handleSelect(result);
  }

  function handleSelect(result: ValidProductSelectionResult) {
    const targetHandle = result.selectedVariant?.product?.handle ?? props.product.handle;
    navigate(`/products/${targetHandle}${variantSearch(result.selectedOptions)}`, {
      replace: true,
      scroll: false,
    });
  }

  function variantSearch(selectedOptions: { name: string; value: string }[]) {
    const params = new URLSearchParams(location.search);
    for (const option of props.product.options) params.delete(option.name);
    for (const option of selectedOptions) params.set(option.name, option.value);
    const search = params.toString();
    return search ? `?${search}` : "";
  }

  function variantHref(selectedOptions: { name: string; value: string }[], handle?: string) {
    const targetHandle = handle ?? props.product.handle;
    return `/products/${targetHandle}${variantSearch(selectedOptions)}`;
  }

  async function submitForm(event: SubmitEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await store.handleFormSubmit(event);
      openCartDrawer();
    } catch (error) {
      console.error("[hydrogen] product form submission error:", error);
    } finally {
      setPending(false);
    }
  }

  function sanitizeQuantity(value: number) {
    setQuantity(Number.isFinite(value) && value > 0 ? Math.floor(value) : 1);
  }

  return (
    <aside class="md:sticky md:top-8 md:self-start">
      <h1 class="text-4xl font-black tracking-tight">{props.product.title}</h1>
      <p class="mt-3 text-lg font-semibold">
        {formatMoney(
          formState().selectedVariant?.price ?? props.product.priceRange.minVariantPrice,
        )}
      </p>

      <hr class="my-8 border-black/10" />

      <div class="space-y-8">
        <For each={formState().options}>
          {(option) => (
            <div>
              <p class="text-sm font-semibold">
                {option.name}{" "}
                <Show when={option.values.find((value) => value.selected)}>
                  {(selected) => <span class="font-normal text-black/60">{selected().name}</span>}
                </Show>
              </p>
              <div
                class={
                  isColor(option.name)
                    ? "mt-3 flex items-center gap-3"
                    : "mt-3 flex flex-wrap gap-2"
                }
              >
                <For each={option.values}>
                  {(value) => (
                    <Show
                      when={value.handle === props.product.handle}
                      fallback={
                        <a
                          href={variantHref(value.selectedOptions, value.handle)}
                          aria-label={isColor(option.name) ? value.name : undefined}
                          class={
                            isColor(option.name)
                              ? "block h-7 w-7 rounded-full"
                              : "flex h-11 min-w-20 items-center justify-center rounded-full border border-black/15 px-5 text-sm font-semibold hover:border-black"
                          }
                          style={
                            isColor(option.name)
                              ? { background: SWATCHES[value.name] ?? "#999" }
                              : undefined
                          }
                        >
                          <Show when={!isColor(option.name)}>{value.name}</Show>
                        </a>
                      }
                    >
                      <button
                        type="button"
                        name={option.name}
                        value={value.name}
                        aria-pressed={value.selected}
                        disabled={!value.exists}
                        aria-label={isColor(option.name) ? value.name : undefined}
                        onClick={() => selectOption(option.name, value.name)}
                        class={
                          isColor(option.name)
                            ? value.selected
                              ? "h-7 w-7 rounded-full ring-2 ring-black ring-offset-2 disabled:opacity-30"
                              : "h-7 w-7 rounded-full disabled:opacity-30"
                            : value.selected
                              ? "h-11 min-w-20 rounded-full bg-black px-5 text-sm font-semibold text-white disabled:opacity-30"
                              : "h-11 min-w-20 rounded-full border border-black/15 px-5 text-sm font-semibold hover:border-black disabled:opacity-30"
                        }
                        style={
                          isColor(option.name)
                            ? { background: SWATCHES[value.name] ?? "#999" }
                            : undefined
                        }
                      >
                        <Show when={!isColor(option.name)}>
                          {value.name}
                          <Show when={value.exists && !value.available}> - Sold out</Show>
                        </Show>
                      </button>
                    </Show>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>

      <div class="mt-8 space-y-2">
        <form
          method="post"
          action="/api/cart"
          class="flex items-center gap-3"
          onSubmit={submitForm}
        >
          <input type="hidden" {...register()("merchandiseId", {})} />
          <div class="flex h-12 items-center rounded-full border border-black/15">
            <button
              type="button"
              aria-label="Decrease quantity"
              class="grid h-12 w-12 place-items-center text-lg"
              onClick={() => sanitizeQuantity(quantity() - 1)}
            >
              -
            </button>
            <input
              type="text"
              inputMode="numeric"
              {...register()("quantity", { value: quantity() })}
              class="h-12 w-10 bg-transparent text-center text-sm font-semibold focus:outline-none"
              onInput={(event) => sanitizeQuantity(Number(event.currentTarget.value))}
            />
            <button
              type="button"
              aria-label="Increase quantity"
              class="grid h-12 w-12 place-items-center text-lg"
              onClick={() => sanitizeQuantity(quantity() + 1)}
            >
              +
            </button>
          </div>
          <button
            type="submit"
            disabled={!addable() || pending()}
            class="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M5 7h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
              <path d="M9 7V5a3 3 0 0 1 6 0v2" />
            </svg>
            {pending()
              ? "Adding..."
              : addable()
                ? "Add to cart"
                : formState().selectedVariant === null
                  ? "Select options"
                  : "Unavailable"}
          </button>
        </form>

        <Show when={formState().errors.userErrors[0]}>
          {(error) => <p class="text-sm text-red-600">{error().message}</p>}
        </Show>

        <Show when={formState().selectedVariant}>
          {(selectedVariant) => (
            <ShopPayButton
              variants={[{ id: selectedVariant().id, quantity: quantity() }]}
              channel="headless"
              disabled={!addable() || pending()}
              width="100%"
              height="48px"
              borderRadius="9999px"
            />
          )}
        </Show>
      </div>

      <Show when={props.product.description}>
        <p class="mt-8 text-sm leading-relaxed text-black/70">{props.product.description}</p>
      </Show>
    </aside>
  );
}
