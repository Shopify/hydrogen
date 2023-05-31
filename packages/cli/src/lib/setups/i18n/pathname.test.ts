import {describe, it, expect} from 'vitest';
import {extractLocale, getPathnameLocaleExtractorFunction} from './pathname.js';
import {transformWithEsbuild} from 'vite';
import {i18nTypeName} from './replacers.js';

describe('Setup i18n with pathname', () => {
  it('extracts the locale from the pathname', () => {
    expect(extractLocale('https://example.com')).toMatchObject({
      language: 'EN',
      country: 'US',
    });
    expect(extractLocale('https://example.com/ja-jp')).toMatchObject({
      language: 'JA',
      country: 'JP',
    });
    expect(extractLocale('https://example.com/es-es/path')).toMatchObject({
      language: 'ES',
      country: 'ES',
    });
  });

  it('adds TS types correctly', async () => {
    const tsFn = getPathnameLocaleExtractorFunction(true, i18nTypeName);

    expect(tsFn).toMatch(
      new RegExp(
        `export type ${i18nTypeName} = .*?\\s*function \\w+\\(\\w+:\\s*\\w+\\):\\s*${i18nTypeName}\\s*{\\n`,
        'gmi',
      ),
    );

    const {code} = await transformWithEsbuild(tsFn, 'file.ts', {
      sourcemap: false,
      tsconfigRaw: {compilerOptions: {target: 'esnext'}},
    });

    expect(code.trim()).toEqual(extractLocale.toString().trim());
  });
});
