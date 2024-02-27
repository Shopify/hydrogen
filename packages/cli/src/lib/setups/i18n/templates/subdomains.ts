import type {LanguageCode, CountryCode} from '../mock-i18n-types.js';

export type I18nLocale = {language: LanguageCode; country: CountryCode};

function getLocaleFromRequest(request: Request): I18nLocale {
  const defaultLocale: I18nLocale = {language: 'EN', country: 'US'};
  const supportedLocales = {
    ES: 'ES',
    FR: 'FR',
    DE: 'DE',
    JP: 'JA',
  } as Record<CountryCode, LanguageCode>;

  const url = new URL(request.url);
  const firstSubdomain = url.hostname
    .split('.')[0]
    ?.toUpperCase() as keyof typeof supportedLocales;

  return supportedLocales[firstSubdomain]
    ? {language: supportedLocales[firstSubdomain], country: firstSubdomain}
    : defaultLocale;
}

export {getLocaleFromRequest};
