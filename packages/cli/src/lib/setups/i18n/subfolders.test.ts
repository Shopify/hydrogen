import {describe, it, expect} from 'vitest';
import {getLocaleFromRequest} from './templates/subfolders.js';

describe('Setup i18n with subfolders', () => {
  it('extracts the locale from the pathname', () => {
    expect(
      getLocaleFromRequest(new Request('https://example.com')),
    ).toMatchObject({
      language: 'EN',
      country: 'US',
    });
    expect(
      getLocaleFromRequest(new Request('https://example.com/ja-jp')),
    ).toMatchObject({
      language: 'JA',
      country: 'JP',
    });
    expect(
      getLocaleFromRequest(new Request('https://example.com/es-es/path')),
    ).toMatchObject({
      language: 'ES',
      country: 'ES',
    });
  });
});
