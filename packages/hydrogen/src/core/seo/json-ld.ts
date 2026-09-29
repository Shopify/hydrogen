import type {
  BreadcrumbItem,
  CreateProductJsonLdOptions,
  JsonLd,
  OrganizationJsonLdInput,
  ProductJsonLdInput,
  ProductJsonLdVariant,
} from "./types";

const SCHEMA_ORG_CONTEXT = "https://schema.org";
const IN_STOCK = `${SCHEMA_ORG_CONTEXT}/InStock`;
const OUT_OF_STOCK = `${SCHEMA_ORG_CONTEXT}/OutOfStock`;

/**
 * Characters that can terminate or alter an inline `<script>` element, or that
 * are line terminators in JavaScript but not in JSON. Each is replaced with its
 * `\uXXXX` escape so the payload stays valid JSON and cannot break out of the
 * `<script type="application/ld+json">` that embeds it.
 */
const UNSAFE_SCRIPT_CHARACTERS: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};
const UNSAFE_SCRIPT_CHARACTERS_RE = /[<>&\u2028\u2029]/g;

/**
 * Serializes one or more JSON-LD nodes for a `<script type="application/ld+json">` element.
 *
 * Plain `JSON.stringify()` is not safe here: a product description containing
 * `</script>` ends the element early and turns the rest of the payload into
 * markup. This escapes `<`, `>`, `&`, and the U+2028/U+2029 line separators as
 * `\u` sequences, which JSON parsers read back as the original characters.
 *
 * Render the result as raw HTML. In React that is `dangerouslySetInnerHTML`;
 * passing it as a text child would HTML-escape the quotes and produce invalid JSON.
 *
 * @example
 * ```tsx
 * <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
 * ```
 */
export function serializeJsonLd(data: JsonLd | readonly JsonLd[]): string {
  return JSON.stringify(data).replace(
    UNSAFE_SCRIPT_CHARACTERS_RE,
    (character) => UNSAFE_SCRIPT_CHARACTERS[character] ?? character,
  );
}

function imageUrl(image: string | { url: string }): string {
  return typeof image === "string" ? image : image.url;
}

function nonEmpty(value: string | null | undefined): string | undefined {
  return value ? value : undefined;
}

function createOffer<TVariant extends ProductJsonLdVariant>(
  variant: TVariant,
  url: string,
): Record<string, unknown> {
  return {
    "@type": "Offer",
    url,
    price: variant.price.amount,
    priceCurrency: variant.price.currencyCode,
    availability: variant.availableForSale ? IN_STOCK : OUT_OF_STOCK,
    sku: nonEmpty(variant.sku),
  };
}

/** Product images with the selected variant's image first, when it has one. */
function orderImages(
  images: ProductJsonLdInput["images"],
  selectedVariant: ProductJsonLdVariant | null | undefined,
): string[] | undefined {
  const urls = (images ?? []).map(imageUrl);
  const selectedImage = selectedVariant?.image?.url;

  if (selectedImage) {
    const index = urls.indexOf(selectedImage);
    if (index > 0) urls.splice(index, 1);
    if (index !== 0) urls.unshift(selectedImage);
  }

  return urls.length > 0 ? urls : undefined;
}

type ProductOffers = { offers?: unknown; sku?: string };

function createProductOffers<TVariant extends ProductJsonLdVariant>(
  product: ProductJsonLdInput,
  { url, selectedVariant, variants, getVariantUrl }: CreateProductJsonLdOptions<TVariant>,
): ProductOffers {
  const offerUrl = (variant: TVariant) => getVariantUrl?.(variant) ?? url;

  if (variants && variants.length > 0) {
    return {
      offers: variants.map((variant) => createOffer(variant, offerUrl(variant))),
      sku: variants.length === 1 ? nonEmpty(variants[0]?.sku) : undefined,
    };
  }

  if (selectedVariant) {
    return {
      offers: createOffer(selectedVariant, offerUrl(selectedVariant)),
      sku: nonEmpty(selectedVariant.sku),
    };
  }

  if (product.priceRange) {
    const { minVariantPrice, maxVariantPrice } = product.priceRange;
    return {
      offers: {
        "@type": "AggregateOffer",
        url,
        priceCurrency: minVariantPrice.currencyCode,
        lowPrice: minVariantPrice.amount,
        highPrice: (maxVariantPrice ?? minVariantPrice).amount,
      },
    };
  }

  return {};
}

/**
 * Builds a schema.org `Product` node with `Offer` data for a product page.
 *
 * Pass `variants` to emit one `Offer` per variant, `selectedVariant` to emit
 * a single `Offer` for the variant on screen, or neither to fall back to an
 * `AggregateOffer` from `priceRange`. The `url` must be the page's canonical
 * URL; variant query params belong on individual offers via `getVariantUrl`.
 *
 * @example
 * ```ts
 * const jsonLd = createProductJsonLd(product, {
 *   url: getCanonicalUrl(request.url, { origin }),
 *   selectedVariant,
 * });
 * ```
 */
export function createProductJsonLd<TVariant extends ProductJsonLdVariant>(
  product: ProductJsonLdInput,
  options: CreateProductJsonLdOptions<TVariant>,
): JsonLd {
  const { url } = options;
  const { offers, sku } = createProductOffers(product, options);

  return {
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": "Product",
    "@id": url,
    url,
    name: product.title,
    description: nonEmpty(product.description),
    productID: nonEmpty(product.id),
    sku,
    category: nonEmpty(product.productType),
    brand: product.vendor ? { "@type": "Brand", name: product.vendor } : undefined,
    image: orderImages(product.images, options.selectedVariant),
    offers,
  };
}

/**
 * Builds a schema.org `BreadcrumbList` node from an ordered list of crumbs.
 *
 * Positions are assigned from the array order. Leave `url` off the last crumb
 * when it is the current page.
 *
 * @example
 * ```ts
 * createBreadcrumbJsonLd([
 *   { name: "Home", url: `${origin}/` },
 *   { name: "Collections", url: `${origin}/collections` },
 *   { name: collection.title },
 * ]);
 * ```
 */
export function createBreadcrumbJsonLd(items: readonly BreadcrumbItem[]): JsonLd {
  return {
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: nonEmpty(item.url),
    })),
  };
}

/**
 * Builds a schema.org `Organization` node for the storefront. Render it once,
 * on every page, from the root layout.
 */
export function createOrganizationJsonLd(input: OrganizationJsonLdInput): JsonLd {
  return {
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": "Organization",
    name: input.name,
    url: input.url,
    logo: nonEmpty(input.logo),
    description: nonEmpty(input.description),
    sameAs: input.sameAs && input.sameAs.length > 0 ? [...input.sameAs] : undefined,
  };
}
