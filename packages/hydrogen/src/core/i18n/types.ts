import type {
  CountryCode as CustomerAccountCountryCode,
  LanguageCode as CustomerAccountLanguageCode,
} from "../../graphql/generated/customer-account-api-types";
import type {
  CountryCode as StorefrontCountryCode,
  LanguageCode as StorefrontLanguageCode,
} from "../../graphql/generated/storefront-api-types";

export type ShopifyLanguageCode = Extract<StorefrontLanguageCode, CustomerAccountLanguageCode>;
export type ShopifyCountryCode = Extract<StorefrontCountryCode, CustomerAccountCountryCode>;

/** A `{language, country}` pair identifying one locale a storefront serves. */
export type ShopifyLocale = {
  language: ShopifyLanguageCode;
  country: ShopifyCountryCode;
};

/**
 * A locale served under a URL path prefix.
 *
 * The prefix is derived from the locale as `/{language}-{country}` (lowercased, `_` → `-`), so
 * `{language: "FR", country: "CA"}` is served at `/fr-ca`. Set `pathSegment` when the derived
 * segment is undesirable, for example `PT_BR` + `BR` derives to `pt-br-br`. A segment is a single
 * path part: no slashes.
 */
export type ShopifyPathnameLocale = ShopifyLocale & {
  pathSegment?: string;
};

/**
 * A locale served from its own hostname. Match is exact on `URL.hostname` (no port), so
 * `fr.example.com`, `example.fr`, and `example.com` are three separate entries. Aliases such as
 * `www.` are a redirect concern and must not be listed here.
 */
export type ShopifyDomainLocale = ShopifyLocale & {
  hostname: string;
};

export type ShopifyI18nRouting =
  | {
      type: "pathname";
      /**
       * Locales served under a prefix. `defaultLocale` is served unprefixed only and must not be
       * listed here, so every page has one canonical URL.
       */
      locales: readonly ShopifyPathnameLocale[];
    }
  | {
      type: "domain";
      /**
       * Locales served per hostname. `defaultLocale` must be listed here so it has a canonical
       * hostname for links and sitemaps; it is also what unrecognized hosts (localhost, preview
       * URLs) resolve to.
       */
      locales: readonly ShopifyDomainLocale[];
    };

/**
 * Module-scope internationalization definition shared by the server request context, route
 * matching, URL builders, and client scripts. Create it with `defineShopifyI18n`.
 */
export type ShopifyI18n = {
  /** Locale used when routing determines nothing: unprefixed paths or unrecognized hostnames. */
  defaultLocale: ShopifyLocale;
  /** Omit for single-locale storefronts. */
  routing?: ShopifyI18nRouting;
};

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

type RoutingLocaleEntry<TI18n extends ShopifyI18n> = TI18n["routing"] extends {
  locales: readonly (infer TLocale)[];
}
  ? TLocale
  : never;

/** Every locale entry a definition can resolve to, keeping any extra per-locale fields. */
export type ShopifySupportedLocale<TI18n extends ShopifyI18n = ShopifyI18n> =
  | TI18n["defaultLocale"]
  | RoutingLocaleEntry<TI18n>;

/**
 * A locale resolved for one request. Routing keys are replaced by the derived `pathPrefix`
 * (`""` for the default locale and for domain routing), which is what URL builders consume.
 */
export type ShopifyMatchedLocale<TI18n extends ShopifyI18n = ShopifyI18n> = DistributiveOmit<
  ShopifySupportedLocale<TI18n>,
  "pathSegment" | "hostname"
> & {
  pathPrefix: string;
};
