import {describe, it, expect} from 'vitest';
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
});
