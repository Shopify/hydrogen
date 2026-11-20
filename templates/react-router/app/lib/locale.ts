import {
  getHtmlLang,
  getLocalizedHref,
  getSupportedLocales,
  isSameLocale,
  type ShopifyI18n,
  type ShopifyLocale,
  type ShopifySupportedLocale,
} from "@shopify/hydrogen";
import { useLocale } from "@shopify/hydrogen/react";

/**
 * Puts an app path under the page's locale prefix: `/collections` becomes `/fr-ca/collections`.
 * The server resolves the locale from each URL, so a link without the prefix would drop the
 * shopper into the default locale. Relative (`?after=…`) and absolute hrefs are left alone.
 */
export function localizePath(path: string, pathPrefix: string): string {
  if (!pathPrefix || !path.startsWith("/") || path.startsWith("//")) return path;
  // The locale root has no trailing slash, so `/fr-ca` stays its one canonical URL.
  return `${pathPrefix}${path.replace(/^\/(?=[?#]|$)/, "")}`;
}

export function useLocalizePath(): (path: string) => string {
  const { pathPrefix } = useLocale();
  return (path) => localizePath(path, pathPrefix);
}

/**
 * A supported locale with the labels the locale picker shows for it. Labels are written in the
 * locale's own language, so shoppers can find theirs whatever the current page's language is.
 */
export type LocaleOption = ShopifyLocale & {
  countryName: string;
  languageName: string;
  /** BCP 47 tag of the label text, for the `lang` attribute. */
  lang: string;
  /** BCP 47 `language-REGION` tag of the linked page, for the `hrefLang` attribute. */
  hrefLang: string;
};

export type LocaleLink = LocaleOption & { href: string; current: boolean };

/**
 * One option per supported locale, default first, or none for a single-locale storefront.
 *
 * Names come from `Intl.DisplayNames`. Set `countryName` or `languageName` on a locale entry in
 * `i18n` to override either one. Call this on the server and pass the result through loader
 * data: browsers ship different ICU data, so names computed during hydration could differ from
 * the server's and cause a mismatch.
 */
export function getLocaleOptions(i18n: ShopifyI18n): LocaleOption[] {
  const locales = getSupportedLocales(i18n);
  return locales.length > 1 ? locales.map(toLocaleOption) : [];
}

/**
 * Links to the same page (path and query) in each option's locale. Under pathname routing they
 * swap the prefix; under domain routing they point at the locale's hostname.
 */
export function getLocaleLinks({
  i18n,
  options,
  currentLocale,
  href,
}: {
  i18n: ShopifyI18n;
  options: readonly LocaleOption[];
  currentLocale: ShopifyLocale;
  href: string;
}): LocaleLink[] {
  return options.map((option) => ({
    ...option,
    href: getLocalizedHref(href, { i18n, locale: option }),
    current: isSameLocale(option, currentLocale),
  }));
}

export function formatLocaleLabel({ countryName, languageName }: LocaleOption): string {
  return `${countryName} (${languageName})`;
}

function toLocaleOption(locale: ShopifySupportedLocale): LocaleOption {
  const { language, country } = locale;
  const lang = getHtmlLang(language);
  // `PT_BR` sold in Portugal is `pt-PT`: the region names the audience, so the market country
  // replaces any region in the language code. A script subtag (`zh-Hant`) is kept.
  const hrefLang = new Intl.Locale(lang, { region: country }).toString();
  const { language: baseLanguage, script } = new Intl.Locale(lang);

  return {
    language,
    country,
    lang,
    hrefLang,
    countryName: readOverride(locale, "countryName") ?? displayName(lang, "region", country),
    languageName:
      readOverride(locale, "languageName") ??
      displayName(lang, "language", script ? `${baseLanguage}-${script}` : baseLanguage),
  };
}

function readOverride(
  locale: ShopifySupportedLocale,
  key: "countryName" | "languageName",
): string | undefined {
  const value: unknown = key in locale ? Reflect.get(locale, key) : undefined;
  return typeof value === "string" && value !== "" ? value : undefined;
}

function displayName(lang: string, type: "region" | "language", code: string): string {
  try {
    const name = new Intl.DisplayNames([lang], { type }).of(code) ?? code;
    // Language names are lowercase in many languages ("français"), but they start a menu item.
    return name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
  } catch {
    return code;
  }
}
