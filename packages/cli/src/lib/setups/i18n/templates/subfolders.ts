import type {LanguageCode, CountryCode} from '../mock-i18n-types.js';

export type I18nLocale = {
  language: LanguageCode;
  country: CountryCode;
  pathPrefix: string;
};

/**
 * @returns {I18nLocale}
 */
function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url);
  const firstPathPart = url.pathname.split('/')[1]?.toUpperCase() ?? '';

  type I18nFromUrl = [I18nLocale['language'], I18nLocale['country']];

  let pathPrefix = '';
  let [language, country]: I18nFromUrl = ['EN', 'US'];

  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
    pathPrefix = '/' + firstPathPart;
    [language, country] = firstPathPart.split('-') as I18nFromUrl;
  }

  return {language, country, pathPrefix};
}

export {getLocaleFromRequest};
