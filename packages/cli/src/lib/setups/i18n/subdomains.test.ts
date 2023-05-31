import {describe, it, expect} from 'vitest';
import {
  extractLocale,
  getSubdomainLocaleExtractorFunction,
} from './subdomains.js';
import {transformWithEsbuild} from 'vite';

describe('Setup i18n with subdomains', () => {
  it('extracts the locale from the subdomain', () => {
    expect(extractLocale('https://example.com')).toMatchObject({
      language: 'EN',
      country: 'US',
    });
    expect(extractLocale('https://jp.example.com')).toMatchObject({
      language: 'JA',
      country: 'JP',
    });
    expect(extractLocale('https://es.sub.example.com')).toMatchObject({
      language: 'ES',
      country: 'ES',
    });
  });

  it('adds TS types correctly', async () => {
    const tsFn = getSubdomainLocaleExtractorFunction(true);

    expect(tsFn).toMatch(/function \w+\(\w+:\s*\w+\):\s*[{},\w\s;:]+{\n/i);

    const {code} = await transformWithEsbuild(tsFn, 'file.ts', {
      sourcemap: false,
      tsconfigRaw: {compilerOptions: {target: 'esnext'}},
    });

    expect(code.trim()).toEqual(extractLocale.toString().trim());
  });
});
