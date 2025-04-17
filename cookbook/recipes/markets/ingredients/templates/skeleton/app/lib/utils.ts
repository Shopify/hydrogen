import {countries, Locale} from '../data/countries';

export function getLocaleFromRequest(request: Request): Locale {
  // Get the user request URL
  const url = new URL(request.url);

  const langPrefixPath = url.pathname.split('/')[1];
  const langPrefixHost = url.host.split('.')[0];

  return (
    getLocaleFromLangPrefix(langPrefixPath) ??
    getLocaleFromLangPrefix(langPrefixHost) ??
    countries.default
  );
}

function getLocaleFromLangPrefix(langPrefix: string): Locale | null {
  switch (langPrefix) {
    case 'en-ca':
      return countries['en-ca'];
    case 'fr-ca':
      return countries['fr-ca'];
    default:
      return null;
  }
}
