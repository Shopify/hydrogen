import type {Localizations, I18nLocale} from '../@types/i18next';
import type {
  LanguageCode,
  CountryCode,
} from '@shopify/hydrogen/storefront-api-types';

// bundle the default translation with the build
import en from '../public/translations/en/translation.json';

export type i18nTranslation = typeof en;

export const localizations: Localizations = {
  default: {
    label: 'United States (USD $)',
    language: 'en',
    country: 'US',
    currency: 'USD',
    pathPrefix: '',
    translation: en,
    isDefault: true,
  },
  '/de-DE': {
    label: 'Germany (EUR €)',
    language: 'de',
    country: 'DE',
    currency: 'EUR',
    pathPrefix: '/de-DE',
    translation: null, // will be loaded on demand
  },
  '/es-ES': {
    label: 'Spain (EUR €)',
    language: 'es',
    country: 'ES',
    currency: 'EUR',
    pathPrefix: '/es-ES',
    translation: null, // will be loaded on demand
  },
  '/fr-FR': {
    label: 'France (EUR €)',
    language: 'fr',
    country: 'FR',
    currency: 'EUR',
    pathPrefix: '/fr-FR',
    translation: null, // will be loaded on demand
  },
};

type I18nStorefrontClient = {
  country: CountryCode;
  language: LanguageCode;
};

/**
 * A server-sive utility to extract the locale and i18n metadada from a request.
 * @param request
 * @example
 * ```ts
 * const {
 *   i18n,
 *   isLocalizedRequest,
 *   pathnameWithoutLocale,
 *   storefrontApiI18n,
 * } = getLocaleFromRequest(request);
 * ```
 */
export function getLocaleFromRequest(request: Request): {
  /* the i18n object for the current locale */
  i18n: I18nLocale;
  /* the i18n object for the current locale, but formatted for the Storefront API */
  i18nStorefrontClient: I18nStorefrontClient;
  /* whether the request url includes a locale prefix */
  isLocalizedRequest: boolean;
  /* the request url without the locale prefix */
  pathnameWithoutLocale: string;
} {
  const url = new URL(request.url);

  // This regex returns ['/en-US', '/about-us'] for a pathname like '/en-US/about-us'
  const [pathPrefix] = url.pathname.split(/(?=\/)/);

  // Get the locale from the path prefix
  const i18n = localizations?.[pathPrefix] ?? localizations.default;

  // The prefix for the locale, e.g. '/en-US'
  const i18nPrefix = `/${i18n.language}-${i18n.country}`;

  return {
    i18n,
    i18nStorefrontClient: {
      country: i18n.country,
      language: i18n.language.toUpperCase() as LanguageCode,
    },
    isLocalizedRequest: url.pathname.startsWith(i18nPrefix),
    pathnameWithoutLocale: url.pathname.replace(i18nPrefix, ''),
  };
}

/**
 * A server-side utility to fetch the translation for a locale.
 * @param request
 * @param i18n
 * @return i18nTranslation
 * @example
 * ```ts
 * const translation = await fetchLocaleTranslation(request, i18n);
 * ```
 * */
export async function fetchLocaleTranslation(
  request: Request,
  i18n: I18nLocale,
) {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const url = new URL(request.url);
    const prodUrl = `${process.env.HYDROGEN_ASSET_BASE_URL}/assets/translations/${i18n.language}/translation.json`;
    const devUrl = `${url.origin}/translations/${i18n.language}/translation.json`;
    console.log(
      `fetching ${i18n.language} translation from`,
      isDev ? devUrl : prodUrl,
    );
    const response = await fetch(isDev ? devUrl : prodUrl);
    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error(`Failed to fetch translation for ${i18n.language}`);
      return en;
    }

    const translation = await response.json();
    return translation as i18nTranslation;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `Failed to fetch translation for ${i18n.language}. Falling back to default locale.\nError:`,
      error,
    );
    return en;
  }
}
