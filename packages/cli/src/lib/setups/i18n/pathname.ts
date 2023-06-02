import {getCodeFormatOptions} from '../../format-code.js';
import {replaceRemixEnv, replaceServerI18n} from './replacers.js';
import type {SetupConfig} from './index.js';

export async function setupI18nPathname(options: SetupConfig) {
  const workPromise = getCodeFormatOptions(options.rootDirectory).then(
    (formatConfig) =>
      replaceServerI18n(
        options,
        formatConfig,
        getPathnameLocaleExtractorFunction,
      ).then(() => replaceRemixEnv(options, formatConfig)),
  );

  return {workPromise};
}

export function getPathnameLocaleExtractorFunction(
  isTs: boolean,
  typeName: string,
) {
  let serializedFn = extractLocale.toString();
  if (process.env.NODE_ENV !== 'test') {
    serializedFn = serializedFn.replaceAll('//!', '');
  }

  return isTs
    ? `export type ${typeName} = {language: LanguageCode; country: CountryCode; pathPrefix: string};\n\n` +
        serializedFn
          .replace(')', `: string): ${typeName}`)
          .replace(`let language`, '$&: LanguageCode')
          .replace(`let country`, '$&: CountryCode')
          .replace(/\.split\(['"]-['"]\)/, '$& as [LanguageCode, CountryCode]')
    : serializedFn;
}

export function extractLocale(requestUrl: string) {
  const url = new URL(requestUrl);
  const firstPathPart = url.pathname.split('/')[1]?.toUpperCase() ?? '';

  //!
  let pathPrefix = '';
  let language = 'EN';
  let country = 'US';

  //!
  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
    pathPrefix = '/' + firstPathPart;
    [language, country] = firstPathPart.split('-') as [string, string];
  }

  //!
  return {language, country, pathPrefix};
}
