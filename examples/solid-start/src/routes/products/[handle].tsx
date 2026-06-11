import { gql } from "@shopify/hydrogen";
import { Title } from "@solidjs/meta";
import { createAsync, query, useParams, type RouteDefinition } from "@solidjs/router";
import { createEffect, createSignal, For, Show } from "solid-js";

import { ProductCard } from "../../components/ProductCard";
import { AnalyticsEvent, analyticsShop, getAnalytics } from "../../lib/analytics";
import { formatMoney } from "../../lib/money";
import { getRequestStorefrontClient } from "../../lib/request-storefront";

const PRODUCT_QUERY = gql(`
  query Product($handle: String!) {
    product(handle: $handle) {
      id
      handle
      title
      vendor
      description
      selectedOrFirstAvailableVariant {
        id
        title
        sku
        price {
          amount
          currencyCode
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 10) {
        nodes {
          url
          altText
        }
      }
      options {
        name
        values
      }
    }
    products(first: 4) {
      nodes {
        handle
        title
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`);

const SWATCHES: Record<string, string> = {
  Green: "#7ea993",
  Clay: "#7d6635",
  Ocean: "#5b8aa6",
  Purple: "#5e4a8a",
  Red: "#a26a72",
};

const fetchProduct = query(async (handle: string) => {
  "use server";
  const storefrontClient = getRequestStorefrontClient();
  const { data } = await storefrontClient.graphql(PRODUCT_QUERY, {
    variables: { handle },
  });
  if (!data?.product) {
    throw new Error(`Product not found: ${handle}`);
  }
  return {
    product: data.product,
    related: data.products?.nodes ?? [],
  };
}, "product");

export const route = {
  preload: ({ params }) => params.handle && fetchProduct(params.handle),
} satisfies RouteDefinition;

export default function Product() {
  const params = useParams<{ handle: string }>();
  const data = createAsync(() => fetchProduct(params.handle));

  createEffect(() => {
    const loaded = data();
    if (!loaded) return;
    const p = loaded.product;
    getAnalytics()?.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: p.id,
          title: p.title,
          price:
            p.selectedOrFirstAvailableVariant?.price.amount ?? p.priceRange.minVariantPrice.amount,
          vendor: p.vendor,
          variantId: p.selectedOrFirstAvailableVariant?.id ?? p.id,
          variantTitle: p.selectedOrFirstAvailableVariant?.title ?? p.title,
          quantity: 1,
          sku: p.selectedOrFirstAvailableVariant?.sku,
        },
      ],
      url: window.location.href,
      shop: analyticsShop,
    });
  });

  return (
    <Show when={data()}>
      {(loaded) => {
        const product = () => loaded().product;
        const related = () => loaded().related;
        const sizeOption = () => product().options.find((o) => o.name === "Size");
        const colorOption = () => product().options.find((o) => o.name === "Color");

        const [selectedSize, setSelectedSize] = createSignal(sizeOption()?.values[0] ?? "");
        const [selectedColor, setSelectedColor] = createSignal(colorOption()?.values[0] ?? "");
        const [quantity, setQuantity] = createSignal(1);

        return (
          <main>
            <Title>{product().title} — Mock.shop</Title>
            <section class="grid grid-cols-1 gap-12 px-6 py-10 md:grid-cols-[minmax(0,1fr)_420px] md:gap-16 md:px-10 md:py-12">
              <div class="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-2">
                <For each={product().images.nodes}>
                  {(image, i) => (
                    <div class="aspect-square overflow-hidden bg-neutral-100">
                      <img
                        src={image.url}
                        alt={image.altText ?? `${product().title} — image ${i() + 1}`}
                        class="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </For>
              </div>

              <aside class="md:sticky md:top-8 md:self-start">
                <h1 class="text-4xl font-black tracking-tight">{product().title}</h1>
                <p class="mt-3 text-lg font-semibold">
                  {formatMoney(product().priceRange.minVariantPrice)}
                </p>

                <hr class="my-8 border-black/10" />

                <Show when={sizeOption()}>
                  {(opt) => (
                    <div>
                      <p class="text-sm font-semibold">Size</p>
                      <div class="mt-3 flex flex-wrap gap-2">
                        <For each={opt().values}>
                          {(value) => (
                            <button
                              onClick={() => setSelectedSize(value)}
                              class={
                                selectedSize() === value
                                  ? "h-11 min-w-20 rounded-full bg-black px-5 text-sm font-semibold text-white"
                                  : "h-11 min-w-20 rounded-full border border-black/15 px-5 text-sm font-semibold hover:border-black"
                              }
                            >
                              {value}
                            </button>
                          )}
                        </For>
                      </div>
                    </div>
                  )}
                </Show>

                <Show when={colorOption()}>
                  {(opt) => (
                    <div class="mt-8">
                      <p class="text-sm font-semibold">
                        Color <span class="font-normal text-black/60">{selectedColor()}</span>
                      </p>
                      <div class="mt-3 flex items-center gap-3">
                        <For each={opt().values}>
                          {(value) => (
                            <button
                              aria-label={value}
                              onClick={() => setSelectedColor(value)}
                              class={
                                selectedColor() === value
                                  ? "h-7 w-7 rounded-full ring-2 ring-black ring-offset-2"
                                  : "h-7 w-7 rounded-full"
                              }
                              style={{
                                background: SWATCHES[value] ?? "#999",
                              }}
                            />
                          )}
                        </For>
                      </div>
                    </div>
                  )}
                </Show>

                <div class="mt-8 flex items-center gap-3">
                  <div class="flex h-12 items-center rounded-full border border-black/15">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      class="grid h-12 w-12 place-items-center text-lg"
                    >
                      –
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={quantity()}
                      onInput={(e) => {
                        const n = Number(e.currentTarget.value);
                        if (Number.isFinite(n) && n >= 1) setQuantity(n);
                      }}
                      class="h-12 w-10 bg-transparent text-center text-sm font-semibold focus:outline-none"
                    />
                    <button
                      aria-label="Increase quantity"
                      onClick={() => setQuantity((q) => q + 1)}
                      class="grid h-12 w-12 place-items-center text-lg"
                    >
                      +
                    </button>
                  </div>
                  <button class="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white hover:opacity-90">
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
                    Add to cart
                  </button>
                </div>

                {product().description ? (
                  <p class="mt-8 text-sm leading-relaxed text-black/70">{product().description}</p>
                ) : null}
              </aside>
            </section>

            <section class="border-t border-black/10 px-6 py-16 md:px-10 md:py-20">
              <h2 class="text-2xl font-black tracking-tight">You may also like</h2>
              <div class="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
                <For
                  each={related()
                    .filter((p) => p.handle !== product().handle)
                    .slice(0, 4)}
                >
                  {(p) => <ProductCard product={p} />}
                </For>
              </div>
            </section>
          </main>
        );
      }}
    </Show>
  );
}
