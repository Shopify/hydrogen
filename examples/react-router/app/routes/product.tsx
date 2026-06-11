import { canAddToCart, getSelectedProductOptions, type SelectedOption } from "@shopify/hydrogen";
import { gql } from "@shopify/hydrogen";
import { ShopPayButton } from "@shopify/hydrogen/react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { ProductCard } from "../components/ProductCard";
import { AnalyticsEvent, analyticsShop, getAnalytics } from "../lib/analytics";
import { openCartDrawer } from "../lib/cart-drawer";
import { formatMoney } from "../lib/money";
import {
  ProductProvider,
  useProductForm,
  type ProductData,
  type ProductVariantData,
} from "../lib/product";
import { storefrontClientContext } from "../lib/storefront";
import type { Route } from "./+types/product";

const PRODUCT_VARIANT_FRAGMENT = gql(`
  fragment ProductVariantFragment on ProductVariant {
    id
    title
    availableForSale
    selectedOptions {
      name
      value
    }
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    image {
      id
      url
      altText
      width
      height
    }
    product {
      title
      handle
    }
    sku
  }
`);

const PRODUCT_FRAGMENT = gql(
  `
  fragment ProductFragment on Product {
    id
    handle
    title
    vendor
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    requiresSellingPlan
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariantFragment
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      ...ProductVariantFragment
    }
    adjacentVariants(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      ...ProductVariantFragment
    }
  }
`,
  [PRODUCT_VARIANT_FRAGMENT],
);

const PRODUCT_QUERY = gql(
  `
  query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
    product(handle: $handle) {
      ...ProductFragment
      description
      images(first: 10) {
        nodes {
          url
          altText
        }
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
`,
  [PRODUCT_FRAGMENT],
);

const SWATCHES: Record<string, string> = {
  Green: "#7ea993",
  Clay: "#7d6635",
  Ocean: "#5b8aa6",
  Purple: "#5e4a8a",
  Red: "#a26a72",
};
const PRODUCT_PATH = "/products";

export function meta({ data }: Route.MetaArgs) {
  const title = data?.product?.title ?? "Product";
  return [{ title: `${title} — Mock.shop` }];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const { data } = await storefrontClient.graphql(PRODUCT_QUERY, {
    variables: {
      handle: params.handle,
      selectedOptions: getSelectedProductOptions(request),
    },
  });
  if (!data?.product) {
    throw new Response("Product not found", { status: 404 });
  }
  const related = data?.products?.nodes ?? [];
  return { product: data.product, related };
}

export default function Product({ loaderData }: Route.ComponentProps) {
  const { product, related } = loaderData;
  const navigate = useNavigate();

  return (
    <ProductProvider
      product={product}
      onSelect={(result) => {
        void navigate(
          toRouterLocation(
            variantUrl(product, result.selectedOptions, result.selectedVariant?.product?.handle),
          ),
          {
            replace: true,
            preventScrollReset: true,
            ...(result.status === "resolved" && { unstable_defaultShouldRevalidate: false }),
          },
        );
      }}
    >
      <main>
        <section className="grid grid-cols-1 gap-12 px-6 py-10 md:grid-cols-[minmax(0,1fr)_420px] md:gap-16 md:px-10 md:py-12">
          <ProductGallery product={product} />
          <ProductPurchasePanel product={product} />
        </section>

        <section className="border-t border-black/10 px-6 py-16 md:px-10 md:py-20">
          <h2 className="text-2xl font-black tracking-tight">You may also like</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
            {related
              .filter((p) => p.handle !== product.handle)
              .slice(0, 4)
              .map((p) => (
                <ProductCard key={p.handle} product={p} />
              ))}
          </div>
        </section>
      </main>
    </ProductProvider>
  );
}

function ProductAnalytics({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: ProductVariantData | null;
}) {
  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;

    analytics.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: product.id,
          title: product.title,
          price:
            selectedVariant?.price.amount ??
            product.selectedOrFirstAvailableVariant?.price.amount ??
            product.priceRange.minVariantPrice.amount,
          vendor: product.vendor,
          variantId: selectedVariant?.id ?? product.id,
          variantTitle: selectedVariant?.title ?? product.title,
          quantity: 1,
          sku: selectedVariant?.sku,
        },
      ],
      url: window.location.href,
      shop: analyticsShop,
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- fire only on product navigation
  }, [product.handle]);

  return null;
}

function ProductGallery({ product }: { product: ProductData }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-2">
      {product.images.nodes.map((image, i) => (
        <div key={image.url} className="aspect-square overflow-hidden bg-neutral-100">
          <img
            src={image.url}
            alt={image.altText ?? `${product.title} — image ${i + 1}`}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function ProductPurchasePanel({ product }: { product: ProductData }) {
  const { selectedVariant } = useProductForm();

  return (
    <aside className="md:sticky md:top-8 md:self-start">
      <ProductAnalytics product={product} selectedVariant={selectedVariant} />
      <h1 className="text-4xl font-black tracking-tight">{product.title}</h1>
      <p className="mt-3 text-lg font-semibold">
        {formatMoney(selectedVariant?.price ?? product.priceRange.minVariantPrice)}
      </p>

      <hr className="my-8 border-black/10" />

      <VariantSelector product={product} />
      <AddToCart product={product} />

      {product.description ? (
        <p className="mt-8 text-sm leading-relaxed text-black/70">{product.description}</p>
      ) : null}
    </aside>
  );
}

function VariantSelector({ product }: { product: ProductData }) {
  const { options, register } = useProductForm();
  const location = useLocation();

  return (
    <div className="space-y-8">
      {options.map((option) => {
        const selectedValue = option.values.find((v) => v.selected)?.name;
        const isColor = option.name.toLowerCase() === "color";

        return (
          <div key={option.name}>
            <p className="text-sm font-semibold">
              {option.name}
              {selectedValue ? (
                <span className="font-normal text-black/60"> {selectedValue}</span>
              ) : null}
            </p>
            <div className={isColor ? "mt-3 flex items-center gap-3" : "mt-3 flex flex-wrap gap-2"}>
              {option.values.map((value) =>
                value.handle !== product.handle ? (
                  <Link
                    key={value.name}
                    to={toRouterLocation(
                      variantUrl(
                        product,
                        value.selectedOptions,
                        value.handle,
                        new URLSearchParams(location.search),
                      ),
                    )}
                    preventScrollReset
                    className={
                      isColor
                        ? "block h-7 w-7 rounded-full"
                        : "flex h-11 min-w-20 items-center justify-center rounded-full border border-black/15 px-5 text-sm font-semibold hover:border-black"
                    }
                    style={isColor ? { background: SWATCHES[value.name] ?? "#999" } : undefined}
                    aria-label={isColor ? value.name : undefined}
                  >
                    {isColor ? null : value.name}
                  </Link>
                ) : (
                  <button
                    key={value.name}
                    type="button"
                    aria-pressed={value.selected}
                    disabled={!value.exists}
                    {...register("optionValue", {
                      optionName: option.name,
                      value: value.name,
                    })}
                    aria-label={isColor ? value.name : undefined}
                    className={
                      isColor
                        ? value.selected
                          ? "h-7 w-7 rounded-full ring-2 ring-black ring-offset-2 disabled:opacity-30"
                          : "h-7 w-7 rounded-full disabled:opacity-30"
                        : value.selected
                          ? "h-11 min-w-20 rounded-full bg-black px-5 text-sm font-semibold text-white disabled:opacity-30"
                          : "h-11 min-w-20 rounded-full border border-black/15 px-5 text-sm font-semibold hover:border-black disabled:opacity-30"
                    }
                    style={isColor ? { background: SWATCHES[value.name] ?? "#999" } : undefined}
                  >
                    {isColor ? null : value.name}
                    {!isColor && value.exists && !value.available ? " - Sold out" : null}
                  </button>
                ),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddToCart({ product }: { product: ProductData }) {
  const { options, selectedVariant, register, formProps, errors, pending } = useProductForm();
  const addable = canAddToCart(product, options);
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="mt-8 space-y-2">
      <form {...formProps({ afterSubmit: openCartDrawer })} className="flex items-center gap-3">
        <input type="hidden" {...register("merchandiseId", {})} />
        <div className="flex h-12 items-center rounded-full border border-black/15">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            className="grid h-12 w-12 place-items-center text-lg"
          >
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            {...register("quantity", { value: quantity })}
            onChange={(event) => {
              const next = Number(event.target.value);
              setQuantity(Number.isFinite(next) && next > 0 ? Math.floor(next) : 1);
            }}
            className="h-12 w-10 bg-transparent text-center text-sm font-semibold focus:outline-none"
          />
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((current) => current + 1)}
            className="grid h-12 w-12 place-items-center text-lg"
          >
            +
          </button>
        </div>
        <button
          type="submit"
          disabled={!addable || pending}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 7h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
            <path d="M9 7V5a3 3 0 0 1 6 0v2" />
          </svg>
          {pending
            ? "Adding…"
            : addable
              ? "Add to cart"
              : selectedVariant === null
                ? "Loading…"
                : "Unavailable"}
        </button>
      </form>
      {errors.userErrors.length > 0 && (
        <p className="text-sm text-red-600">{errors.userErrors[0].message}</p>
      )}
      {selectedVariant ? (
        <ShopPayButton
          variants={[{ id: selectedVariant.id, quantity }]}
          channel="headless"
          disabled={!addable || pending}
          width="100%"
          height="48px"
          borderRadius="9999px"
        />
      ) : null}
    </div>
  );
}

function variantUrl(
  product: { handle: string; options: Array<{ name: string }> },
  selectedOptions: SelectedOption[],
  handle = product.handle,
  base = new URLSearchParams(),
): URL {
  const url = new URL(`${PRODUCT_PATH}/${handle}`, "https://hydrogen.local");
  url.search = base.toString();
  for (const option of product.options) url.searchParams.delete(option.name);
  for (const option of selectedOptions) url.searchParams.set(option.name, option.value);
  return url;
}

function toRouterLocation(url: URL) {
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  };
}
