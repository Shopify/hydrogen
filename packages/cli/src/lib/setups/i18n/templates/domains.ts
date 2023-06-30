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
  const domain = url.hostname
    .split('.')
    .pop()
    ?.toUpperCase() as keyof typeof supportedLocales;

  return supportedLocales[domain]
    ? {language: supportedLocales[domain], country: domain}
    : defaultLocale;
}

export {getLocaleFromRequest};
