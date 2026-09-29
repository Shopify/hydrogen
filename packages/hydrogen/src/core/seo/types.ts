import type { MoneyV2 } from "../money";

/**
 * A schema.org JSON-LD node. Every node carries `@context` and `@type`;
 * everything else is the schema.org vocabulary for that type.
 */
export type JsonLd = {
  "@context": "https://schema.org";
  "@type": string;
  [key: string]: unknown;
};

/** One crumb in a {@link createBreadcrumbJsonLd} trail. */
export type BreadcrumbItem = {
  /** Visible crumb label, for example the collection title. */
  name: string;
  /**
   * Absolute URL of the crumb. Omit for the current page: search engines treat
   * the last crumb as the page itself.
   */
  url?: string;
};

/**
 * Minimum product shape that {@link createProductJsonLd} reads.
 *
 * Mirrors the Storefront API `Product` object. Pass a wider query result;
 * only these fields are used.
 */
export interface ProductJsonLdInput {
  id?: string;
  title: string;
  description?: string | null;
  vendor?: string | null;
  productType?: string | null;
  /** Product images in display order. Accepts URLs or objects with a `url`. */
  images?: ReadonlyArray<string | { url: string }>;
  /** Used for an `AggregateOffer` when no variant is passed. */
  priceRange?: {
    minVariantPrice: MoneyV2;
    maxVariantPrice?: MoneyV2;
  };
}

/**
 * Minimum variant shape that {@link createProductJsonLd} reads when building
 * an `Offer`.
 */
export interface ProductJsonLdVariant {
  id?: string;
  sku?: string | null;
  availableForSale: boolean;
  price: MoneyV2;
  image?: { url: string } | null;
}

export interface CreateProductJsonLdOptions<
  TVariant extends ProductJsonLdVariant = ProductJsonLdVariant,
> {
  /**
   * Absolute canonical URL of the product page. Variant query params must not
   * be part of it; use {@link getCanonicalUrl} to strip them.
   */
  url: string;
  /**
   * The variant the page currently shows. Produces a single `Offer`. When
   * `variants` is also passed, `variants` wins.
   */
  selectedVariant?: TVariant | null;
  /**
   * Every purchasable variant. Produces one `Offer` per variant, which is what
   * Google's merchant listing guidance prefers for multi-variant products.
   */
  variants?: readonly TVariant[];
  /**
   * Builds the `Offer.url` for a variant, for example the product URL with the
   * variant's selected options appended. Defaults to `url`.
   */
  getVariantUrl?: (variant: TVariant) => string;
}

export interface OrganizationJsonLdInput {
  /** Store name, typically `shop.name` from the Storefront API. */
  name: string;
  /** Absolute storefront origin, for example `https://example.com`. */
  url: string;
  /** Absolute logo URL. */
  logo?: string | null;
  description?: string | null;
  /** Social profile URLs. */
  sameAs?: readonly string[];
}

export interface GetCanonicalUrlOptions {
  /**
   * Trusted origin to emit, for example from a `PUBLIC_SITE_ORIGIN` environment
   * variable. Defaults to the origin of `url`. Prefer passing this in
   * production: `Host` and `X-Forwarded-Host` headers are attacker-controlled.
   */
  origin?: string;
  /**
   * Query params to keep. Everything else is dropped so variant selections,
   * filters, sort keys, cursors, and tracking params never create duplicate
   * canonical URLs. Defaults to none.
   */
  keepSearchParams?: readonly string[];
  /** Keep or add a trailing slash. Defaults to `false` (slash removed except on `/`). */
  trailingSlash?: boolean;
}

export type LanguageAlternateLocale = {
  /** BCP 47 tag for the `hreflang` attribute, for example `en-CA` or `fr`. */
  hrefLang: string;
  /** App route prefix for this locale, for example `/fr-ca`. Empty for the default locale. */
  pathPrefix?: string;
};

export interface GetLanguageAlternatesOptions {
  /** Every locale the storefront serves, including the current one. */
  locales: readonly LanguageAlternateLocale[];
  /** The i18n `pathPrefix` present in `url`, so it can be swapped for each locale's prefix. */
  currentPathPrefix?: string;
  /** Trusted origin to emit. Defaults to the origin of `url`. */
  origin?: string;
  /** `hrefLang` of the locale to also emit as `x-default`. */
  xDefault?: string;
}

export type LanguageAlternate = {
  /** `hreflang` attribute value, including `x-default` when requested. */
  hrefLang: string;
  /** Absolute URL of the localized page. */
  href: string;
};
