import {describe, expect, it} from 'vitest';
import {maybeProxyRequest} from '../ingredients/templates/skeleton/app/utils/partytown/maybeProxyRequest';
import {partytownAtomicHeaders} from '../ingredients/templates/skeleton/app/utils/partytown/partytownAtomicHeaders';

describe('partytown recipe', () => {
  describe('maybeProxyRequest', () => {
    const location = {origin: 'https://my-store.com'} as Location;

    it('proxies script requests through /reverse-proxy', () => {
      const url = new URL('https://www.googletagmanager.com/gtm.js');
      const result = maybeProxyRequest(url, location, 'script');

      expect(result.origin).toBe('https://my-store.com');
      expect(result.pathname).toBe('/reverse-proxy');
      expect(result.searchParams.get('apiUrl')).toBe(
        'https://www.googletagmanager.com/gtm.js',
      );
    });

    it('returns the original URL for non-script types', () => {
      const url = new URL('https://www.googletagmanager.com/image.png');
      const result = maybeProxyRequest(url, location, 'image');

      expect(result).toBe(url);
    });

    it('returns the original URL if already proxied', () => {
      const url = new URL(
        'https://my-store.com/reverse-proxy?apiUrl=https://example.com/script.js',
      );
      const result = maybeProxyRequest(url, location, 'script');

      expect(result).toBe(url);
    });

    it('proxies all domains when nonProxyDomains is empty', () => {
      // nonProxyDomains is currently empty, so all domains get proxied.
      // If domains are added to nonProxyDomains, they should bypass the proxy.
      const url = new URL('https://cdn.example.com/lib.js');
      const result = maybeProxyRequest(url, location, 'script');

      expect(result.pathname).toBe('/reverse-proxy');
    });
  });

  describe('partytownAtomicHeaders', () => {
    it('returns COOP and COEP headers for atomic mode', () => {
      const headers = partytownAtomicHeaders();

      expect(headers).toEqual({
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Opener-Policy': 'same-origin',
      });
    });
  });
});
