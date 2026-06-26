import {
  canAddToCart,
  getSelectedProductOptions,
  gql,
  type SelectedOption,
} from "@shopify/hydrogen";
import { ShopPayButton } from "@shopify/hydrogen/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { ProductCard, PRODUCT_CARD_FRAGMENT } from "~/components/ProductCard";
import { AnalyticsEvent, getAnalytics, getAnalyticsShop } from "~/lib/analytics";
import { openCartDrawer } from "~/lib/cart-drawer";
import { formatPrice, salePercent } from "~/lib/money";
import { ProductProvider, useProductForm } from "~/lib/product";
import { storefrontClientContext } from "~/lib/storefront";

import type { Route } from "./+types/product";

const PRODUCT_VARIANT_FRAGMENT = gql(`
  fragment ProductVariantFields on ProductVariant {
    id
    title
    availableForSale
    quantityAvailable
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

const PRODUCT_QUERY = gql(
  `
    query ProductPage($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
      product(handle: $handle) {
        id
        handle
        title
        vendor
        description
        descriptionHtml
        requiresSellingPlan
        encodedVariantExistence
        encodedVariantAvailability
        featuredImage {
          id
          url
          altText
          width
          height
        }
        images(first: 8) {
          nodes {
            id
            url
            altText
            width
            height
          }
        }
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
        options {
          name
          optionValues {
            name
            firstSelectableVariant {
              ...ProductVariantFields
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
          ...ProductVariantFields
        }
        adjacentVariants(
          selectedOptions: $selectedOptions
          ignoreUnknownOptions: true
          caseInsensitiveMatch: true
        ) {
          ...ProductVariantFields
        }
      }
      products(first: 5) {
        nodes {
          ...ProductCard
        }
      }
    }
  `,
  [PRODUCT_VARIANT_FRAGMENT, PRODUCT_CARD_FRAGMENT],
);

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Product · CORE" },
    {
      name: "description",
      content: "Shop the CORE product detail page.",
    },
  ];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle) throw new Response("Not Found", { status: 404 });

  const storefrontClient = context.get(storefrontClientContext);
  const selectedOptions = getSelectedProductOptions(request);
  const { data } = await storefrontClient.graphql(PRODUCT_QUERY, {
    variables: { handle, selectedOptions },
  });

  if (!data?.product) throw new Response("Not Found", { status: 404 });

  return {
    product: data.product,
    relatedProducts: data.products.nodes
      .filter((product) => product.handle !== data.product?.handle)
      .slice(0, 4),
  };
}

type ProductData = Route.ComponentProps["loaderData"]["product"];
type ProductVariant = NonNullable<ProductData["selectedOrFirstAvailableVariant"]>;
type RelatedProduct = Route.ComponentProps["loaderData"]["relatedProducts"][number];

type ProductImage = {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

type SwatchValue = {
  color?: string | null;
  imageUrl?: string | null;
};

function toRouterLocation(url: string) {
  return url;
}

function variantUrl(
  product: { handle: string; options: Array<{ name: string }> },
  selectedOptions: SelectedOption[],
  handle = product.handle,
  base: URLSearchParams = new URLSearchParams(),
) {
  const params = new URLSearchParams(base);
  for (const option of product.options) params.delete(option.name);
  for (const option of selectedOptions) params.set(option.name, option.value);
  const query = params.toString();
  return `/products/${handle}${query ? `?${query}` : ""}`;
}

function buildSwatchLookup(product: ProductData) {
  const lookup = new Map<string, SwatchValue>();
  for (const option of product.options) {
    for (const value of option.optionValues) {
      const swatch = value.swatch;
      lookup.set(`${option.name}:${value.name}`, {
        color: swatch?.color ?? null,
        imageUrl: swatch?.image?.previewImage?.url ?? null,
      });
    }
  }
  return lookup;
}

function hasSwatchData(product: ProductData, optionName: string) {
  const option = product.options.find((candidate) => candidate.name === optionName);
  return Boolean(
    option?.optionValues.some(
      (value) => value.swatch?.color || value.swatch?.image?.previewImage?.url,
    ),
  );
}

function ProductViewedTracker({ product }: { product: ProductData }) {
  useEffect(() => {
    const analytics = getAnalytics();
    const shop = getAnalyticsShop();
    if (!analytics || !shop) return;

    const selectedVariant = product.selectedOrFirstAvailableVariant;
    analytics.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: product.id,
          title: product.title,
          price: selectedVariant?.price.amount ?? product.priceRange.minVariantPrice.amount,
          vendor: product.vendor ?? "",
          variantId: selectedVariant?.id ?? product.id,
          variantTitle: selectedVariant?.title ?? product.title,
          quantity: 1,
          sku: selectedVariant?.sku,
        },
      ],
      url: window.location.href,
      shop,
    });
  }, [product]);

  return null;
}

function useGalleryImages(product: ProductData, selectedVariant: ProductVariant | null) {
  return useMemo(() => {
    const images: ProductImage[] = [];
    const seen = new Set<string>();
    const addImage = (image: ProductImage | null | undefined) => {
      if (!image?.url || seen.has(image.url)) return;
      seen.add(image.url);
      images.push(image);
    };

    addImage(selectedVariant?.image ?? product.featuredImage ?? product.images.nodes[0]);
    for (const image of product.images.nodes) addImage(image);
    return images;
  }, [product, selectedVariant]);
}

function galleryDotClass(active: boolean) {
  if (active) return "bg-on-surface size-2 rounded-full";
  return "bg-on-surface/30 size-2 rounded-full";
}

function ProductGallery({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: ProductVariant | null;
}) {
  const images = useGalleryImages(product, selectedVariant);
  const primaryImageUrl = images[0]?.url;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => setActiveIndex(0), [primaryImageUrl]);

  return (
    <div data-testid="product-gallery">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={product.title}
        className="relative grid"
      >
        <div
          data-product-gallery-track
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto md:grid md:grid-cols-2 md:overflow-visible"
          tabIndex={0}
          onScroll={(event) => {
            const track = event.currentTarget;
            if (track.clientWidth > 0) {
              setActiveIndex(Math.round(track.scrollLeft / track.clientWidth));
            }
          }}
        >
          {images.map((image, index) => (
            <div
              key={image.url}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${index + 1} of ${images.length}`}
              className="w-full shrink-0 snap-center contain-paint md:w-auto md:shrink"
            >
              <div className="bg-surface-secondary aspect-square overflow-hidden">
                <img
                  src={image.url}
                  alt={image.altText ?? product.title}
                  width={image.width ?? undefined}
                  height={image.height ?? undefined}
                  className="h-full w-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  data-testid={index === 0 ? "product-gallery-image" : undefined}
                />
              </div>
            </div>
          ))}
        </div>
        {images.length > 1 ? (
          <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-3 md:hidden">
            <div
              data-slideshow-dots
              role="group"
              aria-label="Slideshow pagination"
              className="flex items-center justify-center gap-2"
            >
              {images.map((image, index) => (
                <span key={image.url} className={galleryDotClass(index === activeIndex)} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PriceBlock({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: ProductVariant | null;
}) {
  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = selectedVariant?.compareAtPrice;
  const percent = salePercent(price, compareAt);

  return (
    <div className="mt-4" data-product-price>
      <div className="inline-flex flex-wrap items-baseline gap-2">
        {compareAt && percent ? (
          <>
            <span className="text-sale font-medium">
              <span className="sr-only">Sale price: </span>
              {formatPrice(price)}
            </span>
            <s className="text-compare text-sm">
              <span className="sr-only">Regular price: </span>
              {formatPrice(compareAt)}
            </s>
            <span className="text-sale text-sm font-medium" aria-label={`Save ${percent}%`}>
              (-{percent}%)
            </span>
          </>
        ) : (
          <span className="text-on-surface font-medium">
            <span className="sr-only">Price: </span>
            {formatPrice(price)}
          </span>
        )}
      </div>
    </div>
  );
}

function InventoryHint({ selectedVariant }: { selectedVariant: ProductVariant | null }) {
  if (!selectedVariant) return null;
  if (!selectedVariant.availableForSale) {
    return (
      <div className="mt-3">
        <div className="flex items-center gap-2 text-sm" data-product-inventory>
          <span
            className="bg-critical inline-block h-2 w-2 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <span className="text-critical font-medium">Out of stock</span>
        </div>
      </div>
    );
  }

  const quantity = selectedVariant.quantityAvailable;
  if (quantity == null || quantity > 5) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 text-sm" data-product-inventory>
        <span
          className="bg-warning inline-block h-2 w-2 shrink-0 rounded-full"
          aria-hidden="true"
        />
        <span className="text-warning font-medium">Only {quantity} left in stock</span>
      </div>
    </div>
  );
}

function VariantOptions({ product }: { product: ProductData }) {
  const { options, register } = useProductForm();
  const swatches = useMemo(() => buildSwatchLookup(product), [product]);
  const location = useLocation();
  const baseParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  return (
    <div className="swatch-buttons space-y-4">
      {options.map((option) => {
        const selectedValue = option.values.find((value) => value.selected)?.name;
        const renderSwatches = hasSwatchData(product, option.name);
        const isColorOption = option.name.toLowerCase().includes("color");

        return (
          <fieldset key={option.name} className="space-y-2">
            <legend className="text-on-surface text-sm font-medium">
              {option.name}
              {selectedValue ? `: ${selectedValue}` : ""}
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label={option.name}>
              {option.values.map((variantOption) => {
                const valueName = variantOption.name;
                const registered = register("optionValue", {
                  optionName: option.name,
                  value: valueName,
                });
                const isCrossProduct = variantOption.handle !== product.handle;
                const linkTarget = variantUrl(
                  product,
                  variantOption.selectedOptions,
                  variantOption.handle,
                  baseParams,
                );

                if (renderSwatches) {
                  const swatch = swatches.get(`${option.name}:${valueName}`);
                  const swatchStyle = swatch?.imageUrl
                    ? { backgroundImage: `url(${swatch.imageUrl})` }
                    : { backgroundColor: swatch?.color ?? undefined };
                  const content = (
                    <>
                      <span
                        className={`swatch-md border-border relative inline-flex items-center justify-center overflow-hidden rounded-full border-2 ring-offset-2 ${variantOption.selected ? "border-interactive" : ""}`}
                        style={swatchStyle}
                      >
                        {variantOption.selected ? (
                          <span className="swatch-scrim absolute inset-0" />
                        ) : null}
                        {!variantOption.available ? (
                          <svg
                            className="absolute inset-0 h-full w-full"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            aria-hidden="true"
                          >
                            <line x1="4" y1="4" x2="20" y2="20" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="sr-only">
                        {valueName}
                        {!variantOption.available ? " (Sold out)" : ""}
                      </span>
                    </>
                  );

                  if (isCrossProduct) {
                    return (
                      <Link
                        key={valueName}
                        to={toRouterLocation(linkTarget)}
                        preventScrollReset
                        className={`min-h-touch-target min-w-touch-target relative inline-flex cursor-pointer items-center justify-center motion-safe:transition-transform motion-safe:active:scale-[0.93] ${!variantOption.available ? "opacity-50" : ""}`}
                        aria-label={valueName}
                        aria-pressed={variantOption.selected}
                        data-testid={isColorOption ? "color-swatch" : undefined}
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={valueName}
                      type="button"
                      {...registered}
                      className={`min-h-touch-target min-w-touch-target relative inline-flex cursor-pointer items-center justify-center motion-safe:transition-transform motion-safe:active:scale-[0.93] ${!variantOption.available ? "opacity-50" : ""}`}
                      aria-label={valueName}
                      aria-pressed={variantOption.selected}
                      disabled={!variantOption.exists}
                      data-testid={isColorOption ? "color-swatch" : undefined}
                    >
                      {content}
                    </button>
                  );
                }

                const pillClass = `option-pill focus-visible:outline-accent motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97] ${!variantOption.available ? "opacity-50" : ""}`;
                const label = `${valueName}${!variantOption.available ? " (Sold out)" : ""}`;

                if (isCrossProduct) {
                  return (
                    <Link
                      key={valueName}
                      to={toRouterLocation(linkTarget)}
                      preventScrollReset
                      className={pillClass}
                      aria-pressed={variantOption.selected}
                      data-testid={isColorOption ? "color-swatch" : undefined}
                    >
                      {label}
                    </Link>
                  );
                }

                return (
                  <button
                    key={valueName}
                    type="button"
                    {...registered}
                    className={pillClass}
                    aria-pressed={variantOption.selected}
                    disabled={!variantOption.exists}
                    data-testid={isColorOption ? "color-swatch" : undefined}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function QuantitySelector({
  quantity,
  setQuantity,
}: {
  quantity: number;
  setQuantity: (quantity: number) => void;
}) {
  const clamp = (value: number) => Math.min(99, Math.max(1, value));

  return (
    <div className="shrink-0">
      <label className="text-on-surface mb-2 block text-sm font-medium" htmlFor="quantity">
        Quantity
      </label>
      <div
        className="quantity-selector-outlined rounded-input inline-flex items-center"
        data-testid="quantity-stepper"
      >
        <button
          type="button"
          className="text-on-surface-secondary hover:text-on-surface inline-flex size-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
          aria-label="Decrease quantity"
          onClick={() => setQuantity(clamp(quantity - 1))}
          disabled={quantity <= 1}
        >
          <img src="/icons/icon-minus.svg" alt="" className="size-4" aria-hidden="true" />
        </button>
        <input
          type="number"
          id="quantity"
          value={quantity}
          min={1}
          max={99}
          step={1}
          className="number-reset text-on-surface h-11 w-12 rounded-none border-0 bg-transparent p-0 text-center text-sm"
          aria-label="Quantity"
          onChange={(event) =>
            setQuantity(clamp(Number.parseInt(event.currentTarget.value, 10) || 1))
          }
        />
        <button
          type="button"
          className="text-on-surface-secondary hover:text-on-surface inline-flex size-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
          aria-label="Increase quantity"
          onClick={() => setQuantity(clamp(quantity + 1))}
          disabled={quantity >= 99}
        >
          <img src="/icons/icon-plus.svg" alt="" className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function AddToCart({
  product,
  quantity,
  selectedVariant,
}: {
  product: ProductData;
  quantity: number;
  selectedVariant: ProductVariant | null;
}) {
  const { options, register, formProps, errors, pending } = useProductForm();
  const addable = canAddToCart(product, options);
  const buttonText = addable ? "Add to cart" : selectedVariant ? "Sold out" : "Select options";

  return (
    <>
      <form {...formProps({ afterSubmit: openCartDrawer })}>
        <input type="hidden" {...register("merchandiseId", {})} />
        <input type="hidden" {...register("quantity", { value: quantity })} />
        <button
          type="submit"
          className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
          disabled={!addable || pending}
          data-testid="add-to-cart"
        >
          {buttonText}
        </button>
      </form>
      {selectedVariant ? (
        <div className="mt-3">
          <ShopPayButton
            variants={[{ id: selectedVariant.id, quantity }]}
            channel="hydrogen"
            disabled={!addable || pending}
            width="100%"
            height="44px"
            borderRadius="8px"
          />
        </div>
      ) : null}
      {[...errors.userErrors, ...errors.warnings, ...errors.networkErrors].length ? (
        <div className="mt-3 grid gap-1 text-sm" role="alert">
          {errors.userErrors.map((error) => (
            <p key={error.message} className="text-critical">
              {error.message}
            </p>
          ))}
          {errors.warnings.map((warning) => (
            <p key={warning.message} className="text-warning">
              {warning.message}
            </p>
          ))}
          {errors.networkErrors.map((error) => (
            <p key={error.message} className="text-critical">
              {error.message}
            </p>
          ))}
        </div>
      ) : null}
    </>
  );
}

function ProductInfo({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: ProductVariant | null;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex flex-col gap-6 md:sticky md:top-8 md:self-start">
      <div className="pt-4 md:pt-8">
        {product.vendor ? (
          <p className="type-body-sm text-on-surface-secondary mb-4 tracking-wide uppercase">
            {product.vendor}
          </p>
        ) : null}
        <h1 className="type-display text-on-surface">{product.title}</h1>
        <PriceBlock product={product} selectedVariant={selectedVariant} />
        <InventoryHint selectedVariant={selectedVariant} />
      </div>

      <span className="sr-only" aria-live="polite" id="inventory-status" />

      {product.description ? (
        <div className="type-body-sm text-on-surface-secondary leading-relaxed">
          {product.description}
        </div>
      ) : null}

      <div data-product-form>
        <span className="sr-only" aria-live="polite" data-add-to-cart-status />
        <VariantOptions product={product} />
        <div className="mt-6 mb-10 flex items-center gap-4">
          <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
        </div>
        <AddToCart product={product} quantity={quantity} selectedVariant={selectedVariant} />
      </div>

      <h2 className="sr-only">Product details</h2>
      <details className="group border-border border-t border-b" name="product-details" open>
        <summary className="marker-hidden text-on-surface hover:text-on-surface-secondary flex cursor-pointer items-center justify-between px-1 py-4 text-sm font-medium">
          <span className="text-sm font-medium">Description</span>
          <span
            className="ms-4 size-4 shrink-0 group-open:rotate-180 motion-safe:transition-transform motion-safe:duration-200"
            aria-hidden="true"
          >
            <img src="/icons/icon-chevron-down.svg" alt="" className="size-4" />
          </span>
        </summary>
        <div className="richtext text-on-surface-secondary px-1 pb-4 text-sm">
          {product.descriptionHtml ? (
            <div dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
          ) : (
            <p>{product.description}</p>
          )}
        </div>
      </details>
    </div>
  );
}

function ProductPageContent({ product }: { product: ProductData }) {
  const { selectedVariant } = useProductForm();

  return (
    <section className="max-w-page px-margin mx-auto w-full pb-4">
      <div className="product-grid mb-16 grid grid-cols-1 gap-6 md:gap-12">
        <ProductGallery product={product} selectedVariant={selectedVariant} />
        <ProductInfo product={product} selectedVariant={selectedVariant} />
      </div>
    </section>
  );
}

function RelatedProducts({ products }: { products: RelatedProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="py-4" aria-labelledby="related-products-heading">
      <div className="border-border border-t pt-12">
        <h2
          id="related-products-heading"
          className="type-heading-xl max-w-page px-margin mx-auto mb-8"
        >
          You may also like
        </h2>
        <div className="max-w-page px-margin mx-auto contain-paint">
          <ul
            role="list"
            className="grid grid-cols-1 gap-x-1 gap-y-10 md:grid-cols-2 lg:grid-cols-4"
          >
            {products.map((product) => (
              <li key={product.handle}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function ProductRoute({ loaderData }: Route.ComponentProps) {
  const { product, relatedProducts } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <ProductProvider
      product={product}
      onSelect={(result) => {
        const url = toRouterLocation(
          variantUrl(
            product,
            result.selectedOptions,
            result.selectedVariant?.product?.handle,
            new URLSearchParams(location.search),
          ),
        );
        void navigate(url, {
          replace: true,
          preventScrollReset: true,
          ...(result.status === "resolved" ? { defaultShouldRevalidate: false } : {}),
        });
      }}
    >
      <ProductViewedTracker product={product} />
      <main className="flex-1" id="main-content" tabIndex={-1}>
        <ProductPageContent product={product} />
        <RelatedProducts products={relatedProducts} />
      </main>
    </ProductProvider>
  );
}
