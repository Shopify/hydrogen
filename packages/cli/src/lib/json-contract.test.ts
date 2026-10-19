import {expect, it} from 'vitest';
import {
  absolutePath,
  storefrontGid,
  storeDomain,
  toStoreDomain,
  toUtcInstant,
  utcInstant,
} from './json-contract.js';
import {listJsonOutputSchema, toListResult} from './storefronts/types.js';
import {envPullJsonOutputSchema} from './environments/types.js';

it('truncates fractions without rounding and normalizes offsets to UTC', () => {
  expect(toUtcInstant('2026-09-30T12:20:30.999+02:00')).toBe(
    '2026-09-30T10:20:30Z',
  );
});
it.each([
  '2026-09-30T10:20:30.001Z',
  '2026-09-30T12:20:30+02:00',
  '2026-09-30',
])('rejects noncanonical public instants: %s', (value) => {
  expect(() => utcInstant.parse(value)).toThrow();
});
it('validates namespaces, store hostnames, and native absolute paths', () => {
  expect(() => storefrontGid.parse('gid://shopify/App/1')).toThrow();
  expect(() => storeDomain.parse('shop.example.com')).toThrow();
  expect(toStoreDomain('shop.example.com')).toBeNull();
  expect(toStoreDomain('Example.myshopify.com')).toBe('example.myshopify.com');
  expect(() => absolutePath.parse('dist/server.js')).toThrow();
});
it('projects storefronts explicitly and keeps unavailable fields null', () => {
  const result = toListResult({
    shop: 'example.myshopify.com',
    storefronts: [
      {
        id: 'gid://shopify/HydrogenStorefront/1',
        title: 'Example',
        currentProductionDeployment: {
          id: 'gid://shopify/HydrogenStorefrontDeployment/1',
          createdAt: '2026-09-30T12:20:30.999+02:00',
          commitMessage: null,
        },
      },
    ],
  });
  expect(JSON.parse(listJsonOutputSchema.encode(result))).toEqual({
    storeDomain: 'example.myshopify.com',
    storefronts: [
      {
        gid: 'gid://shopify/HydrogenStorefront/1',
        name: 'Example',
        productionUrl: null,
        currentProductionDeployment: {
          gid: 'gid://shopify/HydrogenStorefrontDeployment/1',
          createdAt: '2026-09-30T10:20:30Z',
          commitMessage: null,
        },
      },
    ],
  });
  expect(() =>
    listJsonOutputSchema.encode({...result, token: 'private'} as any),
  ).toThrow();
  expect(() =>
    listJsonOutputSchema.encode({
      ...result,
      storefronts: [{...result.storefronts[0], parsedId: '1'}],
    } as any),
  ).toThrow();
});
it('preserves variable spelling and rejects secret values in metadata', () => {
  const result = {
    status: 'success' as const,
    changed: false,
    path: '/project/.env',
    storefrontGid: null,
    storefrontName: null,
    environment: null,
    variables: [{name: 'PRIVATE_TOKEN', id: '42', isSecret: true}],
  };
  expect(JSON.parse(envPullJsonOutputSchema.encode(result))).toEqual(result);
  expect(() =>
    envPullJsonOutputSchema.encode({
      ...result,
      variables: [{name: 'PRIVATE_TOKEN', value: 'private'}],
    } as any),
  ).toThrow();
});
