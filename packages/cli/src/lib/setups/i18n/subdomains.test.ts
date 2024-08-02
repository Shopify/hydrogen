import {describe, it, expect} from 'vitest';
import {getLocaleFromRequest} from '../../../../assets/i18n/subdomains.js';

describe('Setup i18n with subdomains', () => {
  it('extracts the locale from the subdomain', () => {
    expect(
      getLocaleFromRequest(new Request('https://example.com')),
    ).toMatchObject({
      language: 'EN',
      country: 'US',
    });
    expect(
      getLocaleFromRequest(new Request('https://jp.example.com')),
    ).toMatchObject({
      language: 'JA',
      country: 'JP',
    });
    expect(
      getLocaleFromRequest(new Request('https://es.sub.example.com')),
    ).toMatchObject({
      language: 'ES',
      country: 'ES',
    });
  });
});
