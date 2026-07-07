"use client";

import { canAddToCart, type SelectedOption } from "@shopify/hydrogen";
import { ShopPayButton } from "@shopify/hydrogen/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ProductViewedTracker } from "@/components/ProductViewedTracker";
import { QuantityStepper } from "@/components/QuantityStepper";
import { openCartDrawer } from "@/lib/cart-drawer";
import { content } from "@/lib/content";
import { shopifyImageUrl, srcSetFor } from "@/lib/image";
import { formatPrice } from "@/lib/money";
import { ProductProvider, useProductForm } from "@/lib/product";
import type { ProductData } from "@/lib/product-query";
import { canonicalUrl, jsonLdScript } from "@/lib/site";

/**
 * Interactive product details (`hydrogen-variant-form` /
 * `references/nextjs.md`). Wraps the server-fetched product in `ProductProvider`;
 * variant selection + add-to-cart live here (client). Same-product option values
 * are GET `<Link>`s with `aria-current` (no-JS degrades to server variant
 * resolution); cross-product values navigate to the other product; non-existent
 * combinations are disabled `<button>`s with `aria-pressed`.
 */
export function ProductDetails({ product }: { product: ProductData }) {
  const router = useRouter();

  return (
    <ProductProvider
      product={product}
      onSelect={(result) => {
        const targetHandle = result.selectedVariant?.product?.handle ?? product.handle;
        const next = variantUrl(
          product,
          result.selectedOptions,
          targetHandle,
          new URLSearchParams(),
        );
        router.replace(next, { scroll: false });
      }}
    >
      <ProductViewedTracker product={product} />
      <ProductPage product={product} />
    </ProductProvider>
  );
}

function ProductPage({ product }: { product: ProductData }) {
  const { options, selectedVariant, formProps, register, errors } = useProductForm();
  const searchParams = useSearchParams();
  const addable = canAddToCart(product, options);
  const addToCartProps = register("addToCart", {});

  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = selectedVariant?.compareAtPrice ?? null;
  const onSale = compareAt && Number(compareAt.amount) > Number(price.amount);

  const allGalleryImages = product.media.nodes
    .map((node) => (node.__typename === "MediaImage" && node.image ? node.image : null))
    .filter((image): image is NonNullable<typeof image> => image !== null);

  // Reorder so the selected variant's image is first (feedback Round 3 #4 /
  // Round 4 gallery). If the variant image isn't in the media set, prepend it.
  const variantImage = selectedVariant?.image ?? null;
  const galleryImages = (() => {
    if (!variantImage) return allGalleryImages;
    const matchIndex = allGalleryImages.findIndex((image) => image.url === variantImage.url);
    if (matchIndex <= 0) {
      return matchIndex === 0 ? allGalleryImages : [variantImage, ...allGalleryImages];
    }
    return [
      allGalleryImages[matchIndex],
      ...allGalleryImages.slice(0, matchIndex),
      ...allGalleryImages.slice(matchIndex + 1),
    ];
  })();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    image: galleryImages.map((image) => image.url),
    offers: selectedVariant
      ? {
          "@type": "Offer",
          price: selectedVariant.price.amount,
          priceCurrency: selectedVariant.price.currencyCode,
          availability: selectedVariant.availableForSale
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          url: canonicalUrl(`/products/${product.handle}`),
        }
      : {
          "@type": "AggregateOffer",
          priceCurrency: product.priceRange.minVariantPrice.currencyCode,
          lowPrice: product.priceRange.minVariantPrice.amount,
          highPrice: product.priceRange.maxVariantPrice.amount,
        },
  };

  return (
    <div className="max-w-page px-margin mx-auto w-full py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <div className="product-grid mb-16 grid grid-cols-1 gap-6 md:gap-12">
        {/* Gallery */}
        <div className="grid grid-cols-2 gap-2">
          {galleryImages.map((image, index) => (
            <div key={image.url} className="bg-surface-secondary aspect-square overflow-hidden">
              <img
                src={shopifyImageUrl(image.url, { width: index === 0 ? 800 : 400 })}
                srcSet={srcSetFor(image.url, { width: index === 0 ? 800 : 400 })}
                alt={image.altText ?? product.title}
                className="h-full w-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
                {...(index === 0 ? { fetchPriority: "high" } : {})}
              />
            </div>
          ))}
        </div>

        {/* Info column */}
        <div className="flex flex-col gap-4 md:sticky md:top-8 md:self-start">
          <h1 className="type-display">{product.title}</h1>
          {product.vendor ? (
            <p className="text-on-surface-secondary text-sm">{product.vendor}</p>
          ) : null}

          <div className="inline-flex flex-wrap items-baseline gap-2 text-lg">
            <span className={onSale ? "text-sale font-medium" : "text-on-surface font-medium"}>
              {formatPrice(price)}
            </span>
            {onSale && compareAt ? (
              <s className="text-compare text-base">{formatPrice(compareAt)}</s>
            ) : null}
          </div>

          {selectedVariant && !selectedVariant.availableForSale ? (
            <p className="text-on-surface-secondary text-sm">{content.product.soldOut}</p>
          ) : null}

          {/* Variant options */}
          <div className="flex flex-col gap-4">
            {options.map((option) => (
              <fieldset key={option.name} className="flex flex-col gap-2">
                <legend className="type-body-sm text-on-surface font-medium">{option.name}</legend>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) =>
                    value.handle && value.handle !== product.handle ? (
                      // Cross-product value — navigates to the other product
                      // (hydrogen-variant-form combined-listings rule). Uses the
                      // live `useSearchParams` base so unrelated params survive.
                      <Link
                        key={value.name}
                        href={variantUrl(
                          product,
                          value.selectedOptions,
                          value.handle,
                          searchParams,
                        )}
                        scroll={false}
                        className="option-pill no-underline"
                      >
                        {value.name}
                      </Link>
                    ) : value.exists ? (
                      // Same-product value — a real GET `<Link>` to the option
                      // URL so selection works without JS (the server page
                      // resolves the variant). Hydration enhances the same
                      // element via `register("optionValue", ...)`; the
                      // provider `onSelect` syncs the URL client-side.
                      // `aria-current` marks the selected link (`aria-pressed`
                      // is invalid on a link).
                      <Link
                        key={value.name}
                        href={variantUrl(
                          product,
                          value.selectedOptions,
                          value.handle,
                          searchParams,
                        )}
                        replace
                        scroll={false}
                        aria-current={value.selected ? "true" : undefined}
                        className="option-pill no-underline"
                        {...register("optionValue", {
                          optionName: option.name,
                          value: value.name,
                        })}
                      >
                        {value.name}
                      </Link>
                    ) : (
                      // Non-existent combination — no valid option URL to
                      // degrade to, so render a disabled `<button>` with
                      // `aria-pressed` (hydrogen-variant-form).
                      <button
                        key={value.name}
                        type="button"
                        aria-pressed={value.selected}
                        disabled
                        className="option-pill"
                      >
                        {value.name}
                      </button>
                    ),
                  )}
                </div>
              </fieldset>
            ))}
          </div>

          {/* Add to cart form — separate from variant selection (variant-form skill).
              `formProps({ afterSubmit: openCartDrawer })` opens the drawer once
              on a successful reply; do not double-wire it on the button. */}
          <form {...formProps({ afterSubmit: openCartDrawer })} className="flex flex-col gap-3">
            <input type="hidden" {...register("merchandiseId", {})} />
            <div className="flex items-center gap-3">
              <span className="type-body-sm text-on-surface font-medium">
                {content.product.quantity}
              </span>
              <QuantityStepper
                inputProps={register("quantity", { defaultValue: 1 })}
                label={content.product.quantity}
              />
            </div>
            <button
              {...addToCartProps}
              disabled={!addable}
              className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition motion-safe:active:scale-[0.97]"
            >
              {addable
                ? content.product.addToCart
                : selectedVariant
                  ? content.product.soldOut
                  : content.product.selectOptions}
            </button>
          </form>

          {selectedVariant ? (
            <ShopPayButton
              variants={[{ id: selectedVariant.id, quantity: 1 }]}
              channel="hydrogen"
              disabled={!addable}
              width="100%"
              borderRadius="0.5rem"
            />
          ) : null}

          {errors.userErrors.length > 0 ? (
            <ul role="alert" className="text-sale text-sm">
              {errors.userErrors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          ) : null}

          {product.descriptionHtml ? (
            <div className="richtext type-body mt-4">
              <h2 className="type-heading-md mb-2">{content.product.description}</h2>
              <div dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
            </div>
          ) : product.description ? (
            <div className="type-body mt-4">
              <h2 className="type-heading-md mb-2">{content.product.description}</h2>
              <p>{product.description}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Build a product variant URL from a handle + selected options, preserving the
 * live `useSearchParams` (or any `URLSearchParams`) base so unrelated params
 * like `q` or UTM aren't dropped on a cross/combined-listing link
 * (`hydrogen-variant-form` / `references/nextjs.md`).
 */
function variantUrl(
  product: { handle: string; options: Array<{ name: string }> },
  selectedOptions: SelectedOption[],
  handle = product.handle,
  base: URLSearchParams | ReturnType<typeof useSearchParams> = new URLSearchParams(),
): string {
  const params = new URLSearchParams(base);
  for (const option of product.options) params.delete(option.name);
  for (const option of selectedOptions) params.set(option.name, option.value);
  const query = params.toString();
  return `/products/${handle}${query ? `?${query}` : ""}`;
}
