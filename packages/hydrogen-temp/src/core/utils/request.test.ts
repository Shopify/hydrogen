import {describe, it, expect} from 'vitest';
import {getHeader, extractHeaders, matchSfapiRoute} from './request';
import {IncomingMessage} from 'node:http';
import type {Socket} from 'node:net';

describe('request utils', () => {
  describe('find cross runtime request headers', () => {
    it('in browser-like environments', () => {
      const request = new Request('https://example.com', {
        headers: {purpose: 'test'},
      });

      expect(getHeader(request, 'purpose')).toEqual('test');
    });

    it('in Node', () => {
      const request = new IncomingMessage({} as Socket);
      request.headers['purpose'] = 'test';

      expect(getHeader(request, 'purpose')).toEqual('test');
    });
  });

  describe('extractHeaders', () => {
    it('extracts headers using the provided callback', () => {
      const testHeaders = [
        ['x-custom-header', 'custom-value'],
        ['x-another-header', 'another-value'],
      ] satisfies [string, string][];

      const request = new Request('https://example.com', {
        headers: new Headers(testHeaders),
      });

      expect(
        extractHeaders(
          (key) => request.headers.get(key),
          [
            'x-custom-header',
            'x-missing-header-1',
            'x-another-header',
            'x-missing-header-2',
          ],
        ),
      ).toEqual(testHeaders);
    });
  });

  describe('matchSfapiRoute', () => {
    it('matches a standard SFAPI path and captures the version', () => {
      const match = matchSfapiRoute(
        'http://localhost/2024-10/graphql.json',
        '/',
      );
      expect(match).not.toBeNull();
      expect(match![1]).toBe('2024-10');
    });

    it('matches when mounted at an arbitrary prefix', () => {
      const match = matchSfapiRoute(
        'http://localhost/shopify/2024-10/graphql.json',
        '/shopify',
      );
      expect(match).not.toBeNull();
      expect(match![1]).toBe('2024-10');
    });

    it('matches the unstable version', () => {
      const match = matchSfapiRoute(
        'http://localhost/unstable/graphql.json',
        '/',
      );
      expect(match).not.toBeNull();
      expect(match![1]).toBe('unstable');
    });

    it('returns null for non-SFAPI paths', () => {
      expect(
        matchSfapiRoute('http://localhost/2024-10/products.json', '/'),
      ).toBeNull();
      expect(matchSfapiRoute('http://localhost/checkout', '/')).toBeNull();
      expect(matchSfapiRoute('http://localhost/', '/')).toBeNull();
    });

    it('rejects URLs with extra segments between basePath and version', () => {
      expect(
        matchSfapiRoute(
          'http://localhost/shopify/api/2025-10/graphql.json',
          '/shopify',
        ),
      ).toBeNull();
    });

    it('normalizes basePath variants', () => {
      const url = 'http://localhost/shopify/2024-10/graphql.json';
      expect(matchSfapiRoute(url, 'shopify')).not.toBeNull();
      expect(matchSfapiRoute(url, '/shopify')).not.toBeNull();
      expect(matchSfapiRoute(url, '/shopify/')).not.toBeNull();
      expect(matchSfapiRoute(url, 'shopify/')).not.toBeNull();
    });
  });
});
