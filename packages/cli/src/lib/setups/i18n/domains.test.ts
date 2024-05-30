import {describe, it, expect} from 'vitest';
import {readFile} from '@shopify/cli-kit/node/fs';
import {getAssetsDir} from '../../build.js';
import {getLocaleFromRequest} from '../../../../assets/i18n/domains.js';

describe('Setup i18n with domains', () => {
  it('extracts the locale from the domain', () => {
    expect(
      getLocaleFromRequest(new Request('https://example.com')),
    ).toMatchObject({
      language: 'EN',
      country: 'US',
    });
    expect(
      getLocaleFromRequest(new Request('https://example.jp')),
    ).toMatchObject({
      language: 'JA',
      country: 'JP',
    });
    expect(
      getLocaleFromRequest(new Request('https://www.example.es')),
    ).toMatchObject({
      language: 'ES',
      country: 'ES',
    });
  });

  it('does not access imported types directly', async () => {
    const template = await readFile(await getAssetsDir('i18n', 'domains.ts'));

    const typeImports = (template.match(/import\s+type\s+{([^}]+)}/)?.[1] || '')
      .trim()
      .split(/\s*,\s*/);

    expect(typeImports).not.toHaveLength(0);

    // Assert that typed imports are not accessed directly but via `I18nLocale[...]` instead.
    // These types are not imported in the final file.
    const fnCode = template.match(/function .*\n}$/ms)?.[0] || '';
    expect(fnCode).toBeTruthy();

    typeImports.forEach((typeImport) =>
      expect(fnCode).not.toContain(typeImport),
    );
  });
});
