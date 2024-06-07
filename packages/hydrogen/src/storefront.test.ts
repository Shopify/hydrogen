import {vi, describe, it, expect} from 'vitest';
import {createStorefrontClient} from './storefront';
import {fetchWithServerCache} from './cache/server-fetch';
import {STOREFRONT_ACCESS_TOKEN_HEADER} from './constants';
import {
  SHOPIFY_STOREFRONT_S_HEADER,
  SHOPIFY_STOREFRONT_Y_HEADER,
} from '@shopify/hydrogen-react';

vi.mock('./cache/fetch.ts', async () => {
  const original = await vi.importActual<typeof import('./cache/server-fetch')>(
    './cache/fetch.ts',
  );

  return {
    ...original,
    fetchWithServerCache: vi.fn(() =>
      Promise.resolve(['', new Response('ok')]),
    ),
  } satisfies typeof original;
});

describe('createStorefrontClient', () => {
  const storeDomain = 'domain';
  const storefrontId = 'id';
  const publicStorefrontToken = 'public-token';
  const privateStorefrontToken = 'private-token';
  const storefrontHeaders = {
    requestGroupId: '123',
    buyerIp: '::1',
    purpose: 'test',
    cookie: '_shopify_y=123; other=456; _shopify_s=789',
  };

  describe('validation errors', () => {
    it('complains about missing token', async () => {
      expect(() =>
        createStorefrontClient({
          storeDomain,
          storefrontId,
        }),
      ).toThrow('Token');
    });

    it('fails when calling query or mutate with the wrong string', async () => {
      const {storefront} = createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
      });

      expect(() => storefront.query('mutation {}')).toThrow('execute');
      expect(() => storefront.mutate('query {}')).toThrow('execute');
    });
  });

  describe('headers', () => {
    it('uses private token if provided', async () => {
      const {storefront} = createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
        privateStorefrontToken,
      });

      await expect(storefront.query('query {}')).resolves.not.toThrow();
      expect(vi.mocked(fetchWithServerCache).mock.lastCall?.[1]).toMatchObject({
        headers: {
          'Shopify-Storefront-Private-Token': privateStorefrontToken,
        },
      });
    });

    it('fallsback to public token when private one is not provided', async () => {
      const {storefront} = createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
      });

      await expect(storefront.query('query {}')).resolves.not.toThrow();
      expect(vi.mocked(fetchWithServerCache).mock.lastCall?.[1]).toMatchObject({
        headers: {
          [STOREFRONT_ACCESS_TOKEN_HEADER]: publicStorefrontToken,
        },
      });
    });

    it('relays Shopify cookies', async () => {
      const {storefront} = createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
      });

      await expect(storefront.query('query {}')).resolves.not.toThrow();
      expect(vi.mocked(fetchWithServerCache).mock.lastCall?.[1]).toMatchObject({
        headers: {
          [SHOPIFY_STOREFRONT_Y_HEADER]: '123',
          [SHOPIFY_STOREFRONT_S_HEADER]: '789',
        },
      });
    });
  });

  it('adds i18n variables automatically if needed', async () => {
    const {storefront} = createStorefrontClient({
      storeDomain,
      storefrontId,
      storefrontHeaders,
      publicStorefrontToken,
      i18n: {language: 'EN', country: 'US'},
    });

    await expect(
      storefront.query('query Name($something: String) {}'),
    ).resolves.not.toThrow();

    expect(vi.mocked(fetchWithServerCache).mock.lastCall?.[1]).toMatchObject({
      body: expect.stringMatching('"variables":{}'),
    });

    await expect(
      storefront.query(
        'query Name($country: CountryCode, $language: LanguageCode) {}',
      ),
    ).resolves.not.toThrow();
    expect(vi.mocked(fetchWithServerCache).mock.lastCall?.[1]).toMatchObject({
      body: expect.stringMatching(
        '"variables":{"country":"US","language":"EN"}',
      ),
    });
  });

  describe('response errors', () => {
    it('throws when the response is not ok', async () => {
      const {storefront} = createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
      });

      vi.mocked(fetchWithServerCache).mockResolvedValueOnce([
        'my-error',
        new Response('not ok', {status: 500}),
      ]);

      await expect(storefront.query('query {}')).rejects.toThrowError(
        'my-error',
      );
    });

    it('does not throw when the response contains partial SFAPI errors', async () => {
      const {storefront} = createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
        logErrors: false,
      });

      vi.mocked(fetchWithServerCache).mockResolvedValueOnce([
        {
          data: {cart: {}},
          errors: [{message: 'first'}, {message: 'second'}],
        },
        new Response('ok', {status: 200}),
      ]);

      const data = await storefront.query('query {}');
      expect(data).toMatchObject({
        cart: {},
        errors: [
          {message: '[h2:error:storefront.query] first'},
          {message: '[h2:error:storefront.query] second'},
        ],
      });
    });
  });
});
