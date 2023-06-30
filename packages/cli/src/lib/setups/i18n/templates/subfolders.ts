import type {LanguageCode, CountryCode} from '../mock-i18n-types.js';

export type I18nLocale = {
  language: LanguageCode;
  country: CountryCode;
  pathPrefix: string;
};

function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url);
  const firstPathPart = url.pathname.split('/')[1]?.toUpperCase() ?? '';

  let pathPrefix = '';
  let language: LanguageCode = 'EN';
  let country: CountryCode = 'US';

  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
    pathPrefix = '/' + firstPathPart;
    [language, country] = firstPathPart.split('-') as [
      LanguageCode,
      CountryCode,
    ];
  }

  return {language, country, pathPrefix};
}

export {getLocaleFromRequest};
