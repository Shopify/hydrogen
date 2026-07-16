import {afterEach, describe, expect, it, vi} from 'vitest';
import {loader} from '../ingredients/templates/skeleton/app/routes/reverse-proxy';
import {maybeProxyRequest} from '../ingredients/templates/skeleton/app/utils/partytown/maybeProxyRequest';
import {partytownAtomicHeaders} from '../ingredients/templates/skeleton/app/utils/partytown/partytownAtomicHeaders';

describe('partytown recipe', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('reverse-proxy route', () => {
    const forbiddenStatus = 403;
    const storeOrigin = 'https://my-store.com';
    const scriptCacheControl = 'public, immutable';
    const unsupportedMediaTypeStatus = 415;

    it('rejects proxied responses without a JavaScript content type', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response('<script>alert("same-origin")</script>', {
              headers: {
                'content-type': 'text/html; charset=utf-8',
              },
            }),
        ),
      );

      const response = await loadProxyRoute('https://unpkg.com/unsafe-page');

      await expectRejectedProxyResponse(response);
    });

    it('rejects redirects to non-allowlisted domains before following them', async () => {
      const fetch = vi.fn(
        async () =>
          new Response(null, {
            headers: {
              location: 'https://attacker.example/script.js',
            },
            status: 302,
          }),
      );

      vi.stubGlobal('fetch', fetch);

      const response = await loadProxyRoute('https://unpkg.com/redirect');

      expect(response.status).toBe(forbiddenStatus);
      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledWith('https://unpkg.com/redirect', {
        redirect: 'manual',
      });
      expect(response.headers.get('content-type')).toBeNull();
      expect(await response.text()).toBe('');
    });

    it('follows redirects to allowlisted domains', async () => {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(null, {
            headers: {
              location: 'https://unpkg.com/script.js',
            },
            status: 302,
          }),
        )
        .mockResolvedValueOnce(
          new Response('console.log("redirected")', {
            headers: {
              'content-type': 'text/javascript; charset=utf-8',
            },
          }),
        );

      vi.stubGlobal('fetch', fetch);

      const response = await loadProxyRoute('https://unpkg.com/redirect');

      expect(response.status).toBe(200);
      expect(fetch).toHaveBeenNthCalledWith(1, 'https://unpkg.com/redirect', {
        redirect: 'manual',
      });
      expect(fetch).toHaveBeenNthCalledWith(2, 'https://unpkg.com/script.js', {
        redirect: 'manual',
      });
      expect(await response.text()).toBe('console.log("redirected")');
    });

    it('rejects proxied responses without a content type', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('console.log("missing type")')),
      );

      const response = await loadProxyRoute('https://unpkg.com/missing-type');

      await expectRejectedProxyResponse(response);
    });

    it('adds defensive headers to proxied script responses', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response('console.log("loaded")', {
              headers: {
                'cache-control': scriptCacheControl,
                'content-type': 'text/javascript; charset=utf-8',
              },
            }),
        ),
      );

      const response = await loadProxyRoute('https://unpkg.com/script.js');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe(
        'text/javascript; charset=utf-8',
      );
      expect(response.headers.get('cache-control')).toBe(scriptCacheControl);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('content-security-policy')).toBe(
        "default-src 'none'; script-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      );
      expect(await response.text()).toBe('console.log("loaded")');
    });

    function loadProxyRoute(apiUrl: string) {
      const requestUrl = new URL('/reverse-proxy', storeOrigin);
      requestUrl.searchParams.set('apiUrl', apiUrl);

      return loader({request: new Request(requestUrl)} as never);
    }

    async function expectRejectedProxyResponse(response: Response) {
      expect(response.status).toBe(unsupportedMediaTypeStatus);
      expect(response.headers.get('content-type')).toBeNull();
      expect(await response.text()).toBe('');
    }
  });

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
