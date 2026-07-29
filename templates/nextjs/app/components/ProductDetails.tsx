"use client";

import { canAddToCart, type SelectedOption, type StorefrontApi } from "@shopify/hydrogen";
import { createProductComponents, ShopPayButton } from "@shopify/hydrogen/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { openCartDrawer } from "../lib/cart-drawer";
import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { formatPercentOff, formatPrice } from "../lib/money";
import type { PRODUCT_QUERY } from "../products/[handle]/page";
import { ProductViewedTracker } from "./AnalyticsTrackers";
import { ProductCard } from "./ProductCard";

type ProductQuery = StorefrontApi.ResultOf<typeof PRODUCT_QUERY>;
type ProductData = NonNullable<ProductQuery["product"]>;
type VariantData = NonNullable<ProductData["selectedOrFirstAvailableVariant"]>;
type RelatedProduct = ProductQuery["relatedProducts"]["nodes"][number];

const { ProductProvider, useProductForm } = createProductComponents<ProductData>();

function variantUrl(
  product: Pick<ProductData, "handle" | "options">,
  selectedOptions: SelectedOption[],
  handle = product.handle,
  base: URLSearchParams | ReadonlyURLSearchParams = new URLSearchParams(),
) {
  const params = new URLSearchParams(base);
  for (const option of product.options) params.delete(option.name);
  for (const option of selectedOptions) params.set(option.name, option.value);
  const query = params.toString();
  return `/products/${handle}${query ? `?${query}` : ""}`;
}

type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;

function selectedOptionValue(option: { values: Array<{ selected: boolean; name: string }> }) {
  return option.values.find((value) => value.selected)?.name;
}

function swatchImageUrl(value: ProductData["options"][number]["optionValues"][number]) {
  return value.swatch?.image?.previewImage?.url ?? null;
}

function ProductGallery({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: VariantData | null;
}) {
  const images = useMemo(() => {
    const seen = new Set<string>();
    const ordered = [
      selectedVariant?.image,
      product.featuredImage,
      ...product.images.nodes,
    ].flatMap((image) => {
      if (!image?.url || seen.has(image.url)) return [];
      seen.add(image.url);
      return [image];
    });
    return ordered;
  }, [product, selectedVariant]);

  if (images.length === 0) {
    return <div data-testid="product-gallery" className="bg-surface-secondary aspect-square" />;
  }

  return (
    <div data-testid="product-gallery">
      <div
        data-product-gallery-track
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto md:grid md:grid-cols-2 md:overflow-visible"
        tabIndex={0}
        aria-label={`${product.title} gallery images`}
      >
        {images.map((image, index) => (
          <div
            key={image.url}
            role="group"
            aria-roledescription="slide"
            className="w-full shrink-0 snap-center contain-paint md:w-auto"
          >
            <div className="bg-surface-secondary aspect-square overflow-hidden">
              <img
                src={shopifyImageUrl(image.url, {
                  width: 1200,
                  height: 1200,
                  crop: "center",
                })}
                srcSet={srcSetFor(image.url, {
                  width: 1200,
                  height: 1200,
                  crop: "center",
                })}
                sizes="(min-width: 768px) 33vw, 100vw"
                alt={image.altText ?? product.title}
                className="h-full w-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                width={1200}
                height={1200}
                data-testid={index === 0 ? "product-gallery-image" : undefined}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-3 md:hidden">
        <div
          data-slideshow-dots
          role="group"
          aria-label="Slideshow pagination"
          className="flex items-center justify-center gap-2"
        >
          {images.map((image, index) => (
            <span
              key={image.url}
              className={
                index === 0
                  ? "bg-on-surface size-2 rounded-full"
                  : "bg-on-surface/30 size-2 rounded-full"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PriceBlock({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: VariantData | null;
}) {
  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compareAtPrice = selectedVariant?.compareAtPrice;
  const percentOff = formatPercentOff(price, compareAtPrice);

  return (
    <div className="mt-4" data-product-price>
      <div className="inline-flex flex-wrap items-baseline gap-2">
        {compareAtPrice && percentOff ? (
          <>
            <span className="text-sale font-medium">
              <span className="sr-only">Sale price: </span>
              {formatPrice(price)}
            </span>
            <s className="text-compare text-sm">
              <span className="sr-only">Regular price: </span>
              {formatPrice(compareAtPrice)}
            </s>
            <span className="text-sale text-sm font-medium" aria-label={`Save ${percentOff}`}>
              ({percentOff})
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

function InventoryHint({ selectedVariant }: { selectedVariant: VariantData | null }) {
  if (!selectedVariant) return null;
  if (!selectedVariant.availableForSale) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm" data-product-inventory>
        <span
          className="bg-critical inline-block h-2 w-2 shrink-0 rounded-full"
          aria-hidden="true"
        />
        <span className="text-critical font-medium">Out of stock</span>
      </div>
    );
  }

  const quantity = selectedVariant.quantityAvailable;
  if (typeof quantity === "number" && quantity > 0 && quantity <= 5) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm" data-product-inventory>
        <span
          className="bg-warning inline-block h-2 w-2 shrink-0 rounded-full"
          aria-hidden="true"
        />
        <span className="text-warning font-medium">Only {quantity} left in stock</span>
      </div>
    );
  }

  return null;
}

function VariantSelector({ product }: { product: ProductData }) {
  const { options, register } = useProductForm();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  return (
    <div className="swatch-buttons space-y-4">
      {options.map((option) => {
        const current = selectedOptionValue(option);
        const productOption = product.options.find((item) => item.name === option.name);
        const isColor = /colou?r/i.test(option.name);
        const hasSwatches = productOption?.optionValues.some(
          (value) => value.swatch?.color || swatchImageUrl(value),
        );

        return (
          <fieldset key={option.name} className="space-y-2">
            <legend className="text-on-surface text-sm font-medium">
              {option.name}
              {current ? `: ${current}` : ""}
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label={option.name}>
              {option.values.map((value) => {
                const productValue = productOption?.optionValues.find(
                  (item) => item.name === value.name,
                );
                const registered = register("optionValue", {
                  optionName: option.name,
                  value: value.name,
                });
                const url = variantUrl(product, value.selectedOptions, value.handle, searchParams);
                const unavailableLabel = !value.available && value.exists ? " (Sold out)" : "";
                const commonClass = value.exists ? "" : "opacity-50";

                if (value.handle !== product.handle) {
                  return (
                    <Link
                      key={`${option.name}:${value.name}`}
                      href={url}
                      className="option-pill focus-visible:outline-accent motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
                      aria-pressed={value.selected}
                    >
                      {value.name}
                    </Link>
                  );
                }

                if (isColor && hasSwatches) {
                  const imageUrl = productValue ? swatchImageUrl(productValue) : null;
                  return (
                    <button
                      key={`${option.name}:${value.name}`}
                      type="button"
                      {...registered}
                      disabled={!value.exists}
                      aria-pressed={value.selected}
                      aria-label={`${value.name}${unavailableLabel}`}
                      data-testid="color-swatch"
                      className={`min-h-touch-target min-w-touch-target relative inline-flex cursor-pointer items-center justify-center motion-safe:transition-transform motion-safe:active:scale-[0.93] ${commonClass}`}
                    >
                      <span
                        className={`swatch-md relative inline-flex items-center justify-center overflow-hidden rounded-full border-2 ring-offset-2 ${value.selected ? "border-interactive" : "border-border"}`}
                        style={{
                          backgroundColor: productValue?.swatch?.color ?? undefined,
                          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                          backgroundSize: imageUrl ? "cover" : undefined,
                        }}
                        aria-hidden="true"
                      >
                        {!value.available ? (
                          <span className="text-on-surface-secondary absolute inset-0 flex items-center justify-center">
                            /
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={`${option.name}:${value.name}`}
                    type="button"
                    {...registered}
                    disabled={!value.exists}
                    aria-pressed={value.selected}
                    data-testid={isColor ? "color-swatch" : undefined}
                    className={`option-pill focus-visible:outline-accent motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97] ${commonClass}`}
                  >
                    {value.name}
                    {!value.available && value.exists ? (
                      <span className="sr-only"> Sold out</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <input type="hidden" name="returnTo" value={pathname} readOnly />
    </div>
  );
}

function AddToCartForm({ product }: { product: ProductData }) {
  const { options, selectedVariant, register, formProps, errors, pending } = useProductForm();
  const [quantity, setQuantity] = useState(1);
  const addable = canAddToCart(product, options);

  return (
    <div data-product-form>
      <span className="sr-only" aria-live="polite" data-add-to-cart-status />
      <form {...formProps({ afterSubmit: openCartDrawer })}>
        <input type="hidden" {...register("merchandiseId", {})} />
        <div className="mt-6 mb-10 flex items-center gap-4">
          <div className="shrink-0">
            <label className="text-on-surface mb-2 block text-sm font-medium" htmlFor="quantity">
              Quantity
            </label>
            <div
              data-testid="quantity-stepper"
              className="quantity-selector-outlined rounded-input inline-flex items-center"
            >
              <button
                type="button"
                className="text-on-surface-secondary hover:text-on-surface inline-flex h-11 w-11 items-center justify-center focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                <img src="/icons/icon-minus.svg" alt="" className="size-4" aria-hidden="true" />
              </button>
              <input
                {...register("quantity", { value: quantity })}
                id="quantity"
                type="number"
                min={1}
                max={99}
                step={1}
                className="number-reset text-on-surface h-11 w-12 rounded-none border-0 bg-transparent p-0 text-center text-sm focus-visible:outline-none"
                aria-label="Quantity"
                onChange={(event) =>
                  setQuantity(Math.max(1, Number(event.currentTarget.value) || 1))
                }
              />
              <button
                type="button"
                className="text-on-surface-secondary hover:text-on-surface inline-flex h-11 w-11 items-center justify-center focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
                aria-label="Increase quantity"
                onClick={() => setQuantity((value) => Math.min(99, value + 1))}
              >
                <img src="/icons/icon-plus.svg" alt="" className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
          disabled={!addable || pending}
          data-testid="add-to-cart"
        >
          Add to cart
        </button>
        {errors.userErrors.length > 0 || errors.networkErrors.length > 0 ? (
          <div role="alert" className="text-critical mt-3 text-sm">
            {[...errors.userErrors, ...errors.networkErrors]
              .map((error) => error.message)
              .join(" ")}
          </div>
        ) : null}
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
    </div>
  );
}

function ProductInfo({ product }: { product: ProductData }) {
  const { selectedVariant } = useProductForm();

  return (
    <div className="flex flex-col gap-6 md:sticky md:top-8 md:self-start">
      <ProductViewedTracker product={product} selectedVariant={selectedVariant} />
      <div className="pt-4 md:pt-8">
        <p className="type-body-sm text-on-surface-secondary mb-4 tracking-wide uppercase">
          {product.vendor}
        </p>
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
      <VariantSelector product={product} />
      <AddToCartForm product={product} />
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
        <div
          className="richtext text-on-surface-secondary px-1 pb-4 text-sm"
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />
      </details>
    </div>
  );
}

export function ProductDetails({
  product,
  relatedProducts,
}: {
  product: ProductData;
  relatedProducts: RelatedProduct[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const related = relatedProducts.filter((item) => item.handle !== product.handle).slice(0, 4);

  return (
    <ProductProvider
      product={product}
      onSelect={(result) => {
        const nextHandle = result.selectedVariant?.product?.handle ?? product.handle;
        router.replace(variantUrl(product, result.selectedOptions, nextHandle, searchParams), {
          scroll: false,
        });
        if (result.status === "unresolved" || nextHandle !== product.handle) router.refresh();
      }}
    >
      <main className="flex-1" id="main-content" tabIndex={-1}>
        <section className="max-w-page px-margin mx-auto w-full pb-4">
          <div className="product-grid mb-16 grid grid-cols-1 gap-6 md:gap-12">
            <div className="relative">
              <ProductDetailsGallery product={product} />
            </div>
            <ProductInfo product={product} />
          </div>
        </section>
        {related.length > 0 ? (
          <section className="py-4">
            <div className="border-border border-t pt-12">
              <h2 className="type-heading-xl max-w-page px-margin mx-auto mb-8">
                You may also like
              </h2>
              <div className="max-w-page px-margin mx-auto contain-paint">
                <ul
                  role="list"
                  className="grid grid-cols-1 gap-x-1 gap-y-10 md:grid-cols-2 lg:grid-cols-4"
                >
                  {related.map((relatedProduct, index) => (
                    <li key={relatedProduct.id}>
                      <ProductCard product={relatedProduct} priority={index === 0} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </ProductProvider>
  );
}

function ProductDetailsGallery({ product }: { product: ProductData }) {
  const { selectedVariant } = useProductForm();
  return <ProductGallery product={product} selectedVariant={selectedVariant} />;
}
