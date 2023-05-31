import {getCodeFormatOptions} from '../../format-code.js';
import {replaceServerI18n} from './replacers.js';
import type {SetupConfig} from './index.js';

export async function setupI18nSubdomains(options: SetupConfig) {
  const workPromise = getCodeFormatOptions(options.rootDirectory).then(
    (formatConfig) =>
      replaceServerI18n(
        options,
        formatConfig,
        getSubdomainLocaleExtractorFunction,
      ),
  );

  return {workPromise};
}

export function getSubdomainLocaleExtractorFunction(
  isTs: boolean,
  typeName: string,
) {
  let serializedFn = extractLocale.toString();
  if (process.env.NODE_ENV !== 'test') {
    serializedFn = serializedFn.replaceAll('//!', '');
  }

  return isTs
    ? `export type ${typeName} = {language: LanguageCode; country: CountryCode};\n\n` +
        serializedFn
          .replace(')', `: string): ${typeName}`)
          .replace('.toUpperCase()', '$& as keyof typeof supportedLocales')
    : serializedFn;
}

export function extractLocale(requestUrl: string) {
  const defaultLocale = {language: 'EN', country: 'US'} as const;
  const supportedLocales = {
    ES: 'ES',
    FR: 'FR',
    DE: 'DE',
    JP: 'JA',
  } as const;

  //!
  const url = new URL(requestUrl);
  const firstSubdomain = url.hostname
    .split('.')[0]
    ?.toUpperCase() as keyof typeof supportedLocales;

  //!
  return supportedLocales[firstSubdomain]
    ? {language: supportedLocales[firstSubdomain], country: firstSubdomain}
    : defaultLocale;
}
