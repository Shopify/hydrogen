import type {I18nBase} from './mock-i18n-types.js';

/**
 * @returns {I18nBase}
 */
function getLocaleFromRequest(request: Request): I18nBase {
  const defaultLocale: I18nBase = {language: 'EN', country: 'US'};
  const supportedLocales = {
    ES: 'ES',
    FR: 'FR',
    DE: 'DE',
    JP: 'JA',
  } as Record<I18nBase['country'], I18nBase['language']>;

  const url = new URL(request.url);
  const firstSubdomain = url.hostname
    .split('.')[0]
    ?.toUpperCase() as keyof typeof supportedLocales;

  return supportedLocales[firstSubdomain]
    ? {language: supportedLocales[firstSubdomain], country: firstSubdomain}
    : defaultLocale;
}

export {getLocaleFromRequest};
