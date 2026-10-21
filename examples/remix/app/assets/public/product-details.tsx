import {
  buildProductSelectionSearchParams,
  canAddToCart,
  createCartStore,
  createProductFormRegister,
  createProductFormStore,
  type ProductFormStore,
  type SelectedOption,
} from "@shopify/hydrogen";
import { clientEntry, navigate, on, unsafeHTML, type Handle } from "remix/component";

import type { ProductData } from "../../actions/products/page.tsx";
import { cartApiPath } from "../../lib/public/cart-routes.ts";
import { localizePath } from "../../lib/public/i18n.ts";
import { formatMoney } from "../../lib/public/money.ts";
import { routes } from "../../routes.ts";
import { openAside } from "../../ui/public/aside.tsx";
import { Image } from "../../ui/public/image.tsx";
import { getCartStore } from "./cart-store.ts";

type ProductStore = ProductFormStore<ProductData>;
type ProductState = ReturnType<ProductStore["getState"]>;
type OptionValue = ProductState["options"][number]["values"][number];

/**
 * The product image, price, variant options, and add-to-cart form. Hydrogen's product
 * form store derives option existence and availability locally, so a selection updates
 * the price and image immediately; the URL then follows with one in-place navigation.
 *
 * On the server the store runs against an empty cart, so the first HTML already shows
 * the selected variant. Option values are links, so variant selection works without
 * JavaScript; Add to cart needs the hydrated island, as in the Skeleton.
 */
export const ProductDetails = clientEntry(
  import.meta.url,
  function ProductDetails(
    handle: Handle<{ product: ProductData; pathPrefix: string; search: string }>,
  ) {
    const cartStore =
      getCartStore(undefined, handle.props.pathPrefix) ??
      createCartStore({ initialData: { cart: null } });
    const store: ProductStore = createProductFormStore(handle.props.product, cartStore);
    let state = store.getState();
    let storeIdentity = productIdentity(handle.props.product);
    let adding = false;
    let submitError = "";
    // Like the Skeleton, Add to cart stays disabled until this island hydrates, so a
    // click always goes through the cart store and opens the cart drawer.
    let isHydrated = false;
    handle.queueTask(() => {
      isHydrated = true;
      handle.update();
    });

    const unsubscribe = store.subscribe((next) => {
      state = next;
      handle.update();
    });
    handle.signal.addEventListener(
      "abort",
      () => {
        unsubscribe();
        store.destroy();
      },
      { once: true },
    );

    function selectOption(name: string, value: string) {
      const result = store.selectOption(name, value);
      if (result.status === "invalid") return;
      const { pathPrefix, product, search } = handle.props;
      void navigate(
        variantHref(product, product.handle, result.selectedOptions, search, pathPrefix),
        {
          history: "replace",
          resetScroll: false,
        },
      );
    }

    async function addToCart(event: SubmitEvent) {
      if (!getCartStore(undefined, handle.props.pathPrefix)) return;
      event.preventDefault();
      adding = true;
      submitError = "";
      handle.update();
      openAside("cart");

      try {
        await store.handleFormSubmit(event);
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          console.error("[hydrogen] Add to cart failed", error);
          submitError = "Couldn't add this item to your cart. Try again.";
        }
      } finally {
        adding = false;
        handle.update();
      }
    }

    return () => {
      const { pathPrefix, product, search } = handle.props;

      // An in-place navigation brings a new product or selection: hydrate, don't recreate.
      const identity = productIdentity(product);
      if (identity !== storeIdentity) {
        storeIdentity = identity;
        handle.queueTask(() => store.hydrate(product));
      }

      const { options, selectedVariant, errors } = state;
      const addable = canAddToCart(product, options);
      const register = createProductFormRegister(selectedVariant, selectOption);
      const userError = errors.userErrors[0]?.message ?? submitError;
      const price = selectedVariant?.price;
      const compareAtPrice = selectedVariant?.compareAtPrice;
      const image = selectedVariant?.image;

      return (
        <div class="product">
          <div class="product-image">
            {image ? (
              <Image
                key={image.id ?? image.url}
                data={image}
                alt={image.altText || "Product Image"}
                aspectRatio={1}
                loading="eager"
                sizes="(min-width: 45em) 50vw, 100vw"
              />
            ) : null}
          </div>
          <div class="product-main">
            <h1>{product.title}</h1>
            <div aria-label="Price" class="product-price" role="group">
              {compareAtPrice && price ? (
                <div class="product-price-on-sale">
                  {formatMoney(price)}
                  <s>{formatMoney(compareAtPrice)}</s>
                </div>
              ) : price ? (
                formatMoney(price)
              ) : (
                <span>&nbsp;</span>
              )}
            </div>
            <br />
            <div class="product-form">
              {options.map((option) =>
                option.values.length <= 1 ? null : (
                  <div class="product-options" key={option.name}>
                    <h5>{option.name}</h5>
                    <div class="product-options-grid">
                      {option.values.map((value) => (
                        <OptionValueControl
                          key={option.name + value.name}
                          href={variantHref(
                            product,
                            value.handle,
                            value.selectedOptions,
                            search,
                            pathPrefix,
                          )}
                          onSelect={
                            value.handle === product.handle
                              ? register("optionValue", {
                                  optionName: option.name,
                                  value: value.name,
                                }).onClick
                              : undefined
                          }
                          value={value}
                        />
                      ))}
                    </div>
                    <br />
                  </div>
                ),
              )}
              <form
                action={cartApiPath(pathPrefix)}
                method="post"
                mix={on("submit", (event) => void addToCart(event))}
              >
                <input type="hidden" {...register("merchandiseId", {})} />
                <input type="hidden" {...register("quantity", { value: 1 })} />
                <button {...register("addToCart", {})} disabled={!isHydrated || !addable || adding}>
                  {addToCartLabel(adding, addable, selectedVariant)}
                </button>
              </form>
              {userError ? <p role="alert">{userError}</p> : null}
            </div>
            <br />
            <br />
            <p>
              <strong>Description</strong>
            </p>
            <br />
            {/* Merchant-authored HTML from the Storefront API. */}
            <div innerHTML={unsafeHTML(product.descriptionHtml)} />
            <br />
          </div>
        </div>
      );
    };
  },
);

/**
 * One option value. Existing values are real links so they work without JavaScript.
 * Hydrated, a plain click on a same-product value selects it through the store; modified
 * clicks (new tab) and cross-product values in combined listings stay native links.
 */
function OptionValueControl(
  handle: Handle<{ href: string; onSelect?: () => void; value: OptionValue }>,
) {
  return () => {
    const { href, onSelect, value } = handle.props;
    const style = {
      border: value.selected ? "1px solid black" : "1px solid transparent",
      opacity: value.available ? 1 : 0.3,
    };

    if (!value.exists) {
      return (
        <button
          type="button"
          class="product-options-item"
          style={style}
          disabled
          aria-pressed={false}
        >
          <OptionSwatch value={value} />
        </button>
      );
    }

    return (
      <a
        href={href}
        class={`product-options-item${value.selected ? "" : " link"}`}
        style={style}
        aria-current={value.selected ? "true" : undefined}
        data-rmx-reset-scroll="false"
        data-rmx-history="replace"
        mix={
          onSelect
            ? on("click", (event) => {
                const target = event.currentTarget.target;
                const plainClick =
                  !event.defaultPrevented &&
                  event.button === 0 &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey &&
                  !event.altKey &&
                  (!target || target === "_self");
                if (!plainClick) return;
                event.preventDefault();
                onSelect();
              })
            : undefined
        }
      >
        <OptionSwatch value={value} />
        {value.available ? null : <span class="sr-only"> (sold out)</span>}
      </a>
    );
  };
}

function OptionSwatch(handle: Handle<{ value: OptionValue }>) {
  return () => {
    const { value } = handle.props;
    const image = value.swatch?.image?.previewImage?.url;
    const color = value.swatch?.color;
    if (!image && !color) return value.name;

    return (
      <div
        aria-label={value.name}
        class="product-option-label-swatch"
        style={{ backgroundColor: color || "transparent" }}
      >
        {image ? <img src={image} alt={value.name} /> : null}
      </div>
    );
  };
}

function addToCartLabel(
  adding: boolean,
  addable: boolean,
  variant: ProductState["selectedVariant"],
): string {
  if (adding) return "Adding...";
  if (!variant) return "Select options";
  return addable ? "Add to cart" : "Sold out";
}

function variantHref(
  product: ProductData,
  handle: string,
  selectedOptions: readonly SelectedOption[],
  search: string,
  pathPrefix: string,
): string {
  const params = buildProductSelectionSearchParams({
    selectedOptions,
    optionNames: product.options.map((option) => option.name),
    base: new URLSearchParams(search),
  });
  const query = params.size ? `?${params}` : "";
  return localizePath(`${routes.products.show.href({ handle })}${query}`, pathPrefix);
}

function productIdentity(product: ProductData): string {
  return `${product.id}:${product.selectedOrFirstAvailableVariant?.id ?? ""}`;
}
