import { canAddToCart, getSelectedProductOptions, Cache } from "@shopify/hydrogen";
import { ShopPayButton } from "@shopify/hydrogen/react";
import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";

import { Breadcrumbs } from "~/components/Breadcrumbs";
import { ProductCard, type ProductCardData } from "~/components/ProductCard";
import { QuantityStepper } from "~/components/QuantityStepper";
import { AnalyticsEvent, getAnalytics } from "~/lib/analytics";
import { openCartDrawer } from "~/lib/cart-drawer";
import { content } from "~/lib/content";
import { shopifyImageUrl, srcSetFor } from "~/lib/image";
import { formatPrice } from "~/lib/money";
import { ProductProvider, useProductForm } from "~/lib/product";
import { PRODUCT_QUERY, RELATED_PRODUCTS_QUERY, type ProductData } from "~/lib/product-query";
import { canonicalUrl, jsonLdScript } from "~/lib/site";

type ProductInput = { handle: string; search: string };

const getProduct = createServerFn({ method: "GET" })
  .validator((input: ProductInput) => input)
  .handler(async ({ data: input, context }) => {
    const { storefrontClient } = context;
    const selectedOptions = getSelectedProductOptions(new URLSearchParams(input.search));

    const { data, errors } = await storefrontClient.graphql(PRODUCT_QUERY, {
      variables: { handle: input.handle, selectedOptions },
      cache: Cache.short(),
    });

    if (errors) {
      console.error("[hydrogen] Product query failed", errors);
      throw new Response("Product query failed", { status: 500 });
    }

    if (!data?.product) {
      return null;
    }

    // Best-effort related products (F14: non-blocking, degrades silently).
    let relatedProducts: ProductCardData[] = [];
    try {
      const related = await storefrontClient.graphql(RELATED_PRODUCTS_QUERY, {
        variables: { handle: input.handle },
        cache: Cache.short(),
      });
      if (related.data?.product?.relatedProducts) {
        const all = related.data.product.relatedProducts.nodes.flatMap(
          (node) => node.products.nodes,
        );
        relatedProducts = all.filter((p) => p.handle !== input.handle).slice(0, 4);
      }
    } catch {
      // Related products are an enhancement; never break the PDP.
    }

    return {
      product: data.product,
      relatedProducts,
    };
  });

export const Route = createFileRoute("/products/$handle")({
  validateSearch: (search) => search as Record<string, unknown>,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params, location }) => {
    const product = await getProduct({
      data: { handle: params.handle, search: location.searchStr },
    });
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Product not found — CORE" }, { name: "robots", content: "noindex" }],
      };
    }
    const product = loaderData?.product;
    const title = product?.title ?? "Product";
    return {
      meta: [
        { title: `${title} — CORE` },
        { name: "description", content: product?.description ?? "" },
        { property: "og:title", content: `${title} — CORE` },
        { property: "og:description", content: product?.description ?? "" },
        { property: "og:type", content: "product" },
        { property: "og:url", content: canonicalUrl(`/products/${params.handle}`) },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: canonicalUrl(`/products/${params.handle}`) }],
    };
  },
  component: ProductRoute,
  notFoundComponent: ProductNotFound,
});

function ProductRoute() {
  const loaderData = Route.useLoaderData();
  const product = loaderData.product;
  const navigate = useNavigate();

  return (
    <ProductProvider
      product={product}
      onSelect={(result) => {
        const targetHandle = result.selectedVariant?.product?.handle ?? product.handle;
        void navigate({
          to: "/products/$handle",
          params: { handle: targetHandle },
          search: variantSearch(result.selectedOptions),
          replace: true,
          resetScroll: false,
        });
      }}
    >
      <ProductViewedTracker product={product} />
      <ProductPage product={product} relatedProducts={loaderData.relatedProducts} />
    </ProductProvider>
  );
}

function ProductNotFound() {
  return (
    <div className="max-w-page px-margin mx-auto w-full py-16 text-center">
      <h1 className="type-display">Product not found</h1>
    </div>
  );
}

function ProductViewedTracker({ product }: { product: ProductData }) {
  const publishedProductHandleRef = useRef<string | undefined>(undefined);
  const variant = product.selectedOrFirstAvailableVariant;
  const productHandle = product.handle;
  const productId = product.id;
  const productTitle = product.title;
  const productVendor = product.vendor;
  const productPrice = variant?.price.amount ?? product.priceRange.minVariantPrice.amount;
  const variantId = variant?.id ?? productId;
  const variantTitle = variant?.title ?? productTitle;
  const variantSku = variant?.sku ?? undefined;

  useEffect(() => {
    if (publishedProductHandleRef.current === productHandle) return;

    const analytics = getAnalytics();
    if (!analytics) return;

    analytics.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: productId,
          title: productTitle,
          price: productPrice,
          vendor: productVendor,
          variantId,
          variantTitle,
          quantity: 1,
          sku: variantSku,
        },
      ],
    });
    publishedProductHandleRef.current = productHandle;
  }, [
    productHandle,
    productId,
    productPrice,
    productTitle,
    productVendor,
    variantId,
    variantSku,
    variantTitle,
  ]);

  return null;
}

function ProductPage({
  product,
  relatedProducts,
}: {
  product: ProductData;
  relatedProducts: ProductCardData[];
}) {
  const { options, selectedVariant, formProps, register, errors, pending } = useProductForm();
  const lastSelectedVariantRef = useRef(selectedVariant ?? product.selectedOrFirstAvailableVariant);

  useEffect(() => {
    if (selectedVariant) lastSelectedVariantRef.current = selectedVariant;
  }, [selectedVariant]);

  // Keep the hosted Shop Pay element mounted while an option combination is
  // unresolved. The last confirmed variant remains visible but disabled until
  // Hydrogen resolves the next selection, so it can never purchase a stale ID.
  const shopPayVariant = selectedVariant ?? lastSelectedVariantRef.current;
  const addable = canAddToCart(product, options);
  // Stable add-to-cart submit button props (hydrogen-variant-form `register` API).
  const addToCartProps = register("addToCart", {});

  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = selectedVariant?.compareAtPrice ?? null;
  const onSale = compareAt && Number(compareAt.amount) > Number(price.amount);

  const allGalleryImages = product.media.nodes
    .map((node) => (node.__typename === "MediaImage" && node.image ? node.image : null))
    .filter((image): image is NonNullable<typeof image> => image !== null);

  // Reorder so the selected variant's image is first — picking a color swaps
  // the gallery to lead with that variant's image (feedback). If the variant
  // image isn't in the media set, it's prepended so it still leads.
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
      <div className="mb-6">
        <Breadcrumbs
          items={[{ label: "Collections", to: "/collections" }, { label: product.title }]}
        />
      </div>

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
                      // (hydrogen-variant-form combined-listings rule).
                      <Link
                        key={value.name}
                        to="/products/$handle"
                        params={{ handle: value.handle }}
                        search={variantSearch(value.selectedOptions)}
                        resetScroll={false}
                        aria-current={value.selected ? "true" : undefined}
                        className="option-pill no-underline"
                      >
                        {value.name}
                      </Link>
                    ) : value.exists ? (
                      // Same-product value — a real GET `<Link>` to the option
                      // URL so selection works without JS. Hydration enhances
                      // the same element through the product form register;
                      // ProductProvider owns selection state and onSelect keeps
                      // the TanStack Router URL in sync.
                      <Link
                        key={value.name}
                        to="/products/$handle"
                        params={{ handle: value.handle }}
                        search={variantSearch(value.selectedOptions)}
                        replace
                        resetScroll={false}
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
          <form
            {...formProps({ afterSubmit: openCartDrawer })}
            className="flex flex-col gap-3"
            aria-busy={pending}
          >
            <input type="hidden" {...register("merchandiseId", {})} />
            <div className="flex items-center gap-3">
              <span className="type-body-sm text-on-surface font-medium">
                {content.product.quantity}
              </span>
              <QuantityStepper
                inputProps={register("quantity", { defaultValue: 1 })}
                label={content.product.quantity}
                disabled={pending}
              />
            </div>
            <button
              {...addToCartProps}
              disabled={!addable || pending}
              className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 motion-safe:transition motion-safe:active:scale-[0.97]"
            >
              {pending
                ? "Adding…"
                : addable
                  ? content.product.addToCart
                  : selectedVariant
                    ? content.product.soldOut
                    : content.product.selectOptions}
            </button>
          </form>

          {shopPayVariant ? (
            <ShopPayButton
              variants={[{ id: shopPayVariant.id, quantity: 1 }]}
              channel="hydrogen"
              disabled={!selectedVariant || !addable || pending}
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

      {relatedProducts.length > 0 ? (
        <section className="mt-16">
          <h2 className="type-heading-xl mb-6">{content.product.relatedProducts}</h2>
          <ul
            role="list"
            className="grid grid-cols-2 gap-x-1 gap-y-10 contain-paint lg:grid-cols-4"
          >
            {relatedProducts.map((related) => (
              <li key={related.id}>
                <ProductCard product={related} loading="lazy" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Build TanStack Router search params from the selected product options. */
function variantSearch(selectedOptions: { name: string; value: string }[]) {
  return Object.fromEntries(selectedOptions.map((option) => [option.name, option.value])) as Record<
    string,
    string
  >;
}
