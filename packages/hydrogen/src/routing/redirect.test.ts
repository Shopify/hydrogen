import {describe, it, expect, vi, afterEach} from 'vitest';
import type {Storefront} from '../storefront';
import {storefrontRedirect} from './redirect';

describe('storefrontRedirect', () => {
  const shopifyDomain = 'https://domain.myshopify.com';
  const queryMock = vi.fn();
  const storefrontMock = {
    getShopifyDomain: () => shopifyDomain,
    query: queryMock,
  } as unknown as Storefront;

  afterEach(() => {
    queryMock.mockReset();
  });

  it('redirects to Shopify admin ', async () => {
    await expect(
      storefrontRedirect({
        storefront: storefrontMock,
        request: new Request('https://domain.com/admin'),
      }),
    ).resolves.toEqual(
      new Response(null, {
        status: 301,
        headers: {location: shopifyDomain + '/admin'},
      }),
    );
  });

  it('queries the SFAPI and redirects on match', async () => {
    queryMock.mockResolvedValueOnce({
      urlRedirects: {edges: [{node: {target: shopifyDomain + '/some-page'}}]},
    });

    await expect(
      storefrontRedirect({
        storefront: storefrontMock,
        request: new Request('https://domain.com/some-page'),
      }),
    ).resolves.toEqual(
      new Response(null, {
        status: 301,
        headers: {location: shopifyDomain + '/some-page'},
      }),
    );

    expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
      variables: {query: 'path:/some-page'},
    });
  });

  it('strips trailing slashes on the redirect query', async () => {
    queryMock.mockResolvedValueOnce({
      urlRedirects: {edges: [{node: {target: shopifyDomain + '/some-page'}}]},
    });

    await expect(
      storefrontRedirect({
        storefront: storefrontMock,
        request: new Request('https://domain.com/some-page/'),
      }),
    ).resolves.toEqual(
      new Response(null, {
        status: 301,
        headers: {location: shopifyDomain + '/some-page'},
      }),
    );
    expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
      variables: {query: 'path:/some-page'},
    });
  });

  it('queries the SFAPI with the url lower cased', async () => {
    queryMock.mockResolvedValueOnce({
      urlRedirects: {edges: [{node: {target: shopifyDomain + '/some-page'}}]},
    });

    await expect(
      storefrontRedirect({
        storefront: storefrontMock,
        request: new Request('https://domain.com/some-PAGE'),
      }),
    ).resolves.toEqual(
      new Response(null, {
        status: 301,
        headers: {location: shopifyDomain + '/some-page'},
      }),
    );

    expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
      variables: {query: 'path:/some-page'},
    });
  });

  describe('Single Fetch soft navigations (.data suffix)', () => {
    it('detects .data suffix as soft navigation and returns redirect headers', async () => {
      queryMock.mockResolvedValueOnce({
        urlRedirects: {edges: [{node: {target: shopifyDomain + '/some-page'}}]},
      });

      await expect(
        storefrontRedirect({
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/some-page.data?_routes=root,routes/some-page',
          ),
        }),
      ).resolves.toEqual(
        new Response(null, {
          status: 204,
          headers: {
            'X-Remix-Redirect': shopifyDomain + '/some-page',
            'X-Remix-Status': '301',
          },
        }),
      );

      expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
        variables: {query: 'path:/some-page'},
      });
    });

    it('strips .data suffix before matching redirects', async () => {
      queryMock.mockResolvedValueOnce({
        urlRedirects: {edges: [{node: {target: '/collections/new'}}]},
      });

      await expect(
        storefrontRedirect({
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/old-collection.data?_routes=root,routes/$',
          ),
        }),
      ).resolves.toEqual(
        new Response(null, {
          status: 204,
          headers: {
            'X-Remix-Redirect': '/collections/new',
            'X-Remix-Status': '301',
          },
        }),
      );

      expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
        variables: {query: 'path:/old-collection'},
      });
    });

    it('handles admin redirect during soft navigation', async () => {
      await expect(
        storefrontRedirect({
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/admin.data?_routes=root,routes/$',
          ),
        }),
      ).resolves.toEqual(
        new Response(null, {
          status: 204,
          headers: {
            'X-Remix-Redirect': shopifyDomain + '/admin',
            'X-Remix-Status': '301',
          },
        }),
      );
    });

    it('matches query parameters with matchQueryParams enabled', async () => {
      queryMock.mockResolvedValueOnce({
        urlRedirects: {edges: [{node: {target: shopifyDomain + '/some-page'}}]},
      });

      await expect(
        storefrontRedirect({
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/some-page.data?test=true&_routes=root,routes/$',
          ),
          matchQueryParams: true,
        }),
      ).resolves.toEqual(
        new Response(null, {
          status: 204,
          headers: {
            'X-Remix-Redirect': shopifyDomain + '/some-page',
            'X-Remix-Status': '301',
          },
        }),
      );

      expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
        variables: {query: 'path:/some-page?test=true'},
      });
    });

    it('propagates query parameters to the redirect destination', async () => {
      queryMock.mockResolvedValueOnce({
        urlRedirects: {
          edges: [
            {
              node: {
                target: shopifyDomain + '/some-redirect?redirectParam=true',
              },
            },
          ],
        },
      });

      await expect(
        storefrontRedirect({
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/some-page.data?requestParam=true&_routes=root,routes/$',
          ),
        }),
      ).resolves.toEqual(
        new Response(null, {
          status: 204,
          headers: {
            'X-Remix-Redirect':
              shopifyDomain +
              '/some-redirect?redirectParam=true&requestParam=true',
            'X-Remix-Status': '301',
          },
        }),
      );

      expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
        variables: {query: 'path:/some-page'},
      });
    });

    it('propagates query parameters to relative redirect URLs', async () => {
      queryMock.mockResolvedValueOnce({
        urlRedirects: {
          edges: [{node: {target: '/some-redirect?redirectParam=true'}}],
        },
      });

      await expect(
        storefrontRedirect({
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/some-page.data?requestParam=true&_routes=root,routes/$',
          ),
        }),
      ).resolves.toEqual(
        new Response(null, {
          status: 204,
          headers: {
            'X-Remix-Redirect':
              '/some-redirect?redirectParam=true&requestParam=true',
            'X-Remix-Status': '301',
          },
        }),
      );

      expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
        variables: {query: 'path:/some-page'},
      });
    });

    it('handles _root.data for root route soft navigation', async () => {
      queryMock.mockResolvedValueOnce({
        urlRedirects: {edges: [{node: {target: '/home'}}]},
      });

      await expect(
        storefrontRedirect({
          storefront: storefrontMock,
          request: new Request('https://domain.com/_root.data?_routes=root'),
        }),
      ).resolves.toEqual(
        new Response(null, {
          status: 204,
          headers: {
            'X-Remix-Redirect': '/home',
            'X-Remix-Status': '301',
          },
        }),
      );

      expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
        // Root "/" becomes "" after trailing-slash stripping
        variables: {query: 'path:'},
      });
    });

    it('handles /_.data for trailing-slash-aware soft navigation', async () => {
      queryMock.mockResolvedValueOnce({
        urlRedirects: {edges: [{node: {target: '/products'}}]},
      });

      await expect(
        storefrontRedirect({
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/products/_.data?_routes=root,routes/products',
          ),
        }),
      ).resolves.toEqual(
        new Response(null, {
          status: 204,
          headers: {
            'X-Remix-Redirect': '/products',
            'X-Remix-Status': '301',
          },
        }),
      );

      expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
        variables: {query: 'path:/products'},
      });
    });

    it('returns 404 when no redirect matches', async () => {
      queryMock.mockResolvedValueOnce({urlRedirects: {edges: []}});
      const response = new Response('Not Found', {status: 404});

      await expect(
        storefrontRedirect({
          response,
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/nonexistent.data?_routes=root,routes/$',
          ),
        }),
      ).resolves.toEqual(response);

      expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
        variables: {query: 'path:/nonexistent'},
      });
    });
  });

  it('queries the SFAPI and returns 404 on mismatch', async () => {
    queryMock.mockResolvedValueOnce({
      urlRedirects: {edges: []},
    });

    const response = new Response('Not Found', {status: 404});

    await expect(
      storefrontRedirect({
        response,
        storefront: storefrontMock,
        request: new Request('https://domain.com/some-page'),
      }),
    ).resolves.toEqual(response);

    expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
      variables: {query: 'path:/some-page'},
    });
  });

  describe('redirect fallback with search params', () => {
    it('uses the "redirect" search param as a fallback', async () => {
      queryMock.mockResolvedValueOnce({urlRedirects: {edges: []}});
      const response = new Response('Not Found', {status: 404});

      await expect(
        storefrontRedirect({
          response,
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/missing?redirect=/some-page',
          ),
        }),
      ).resolves.toEqual(
        new Response(null, {status: 301, headers: {location: '/some-page'}}),
      );
    });

    it('uses the "return_to" search param as a fallback', async () => {
      queryMock.mockResolvedValueOnce({urlRedirects: {edges: []}});
      const response = new Response('Not Found', {status: 404});

      await expect(
        storefrontRedirect({
          response,
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/missing?return_to=/some-page',
          ),
        }),
      ).resolves.toEqual(
        new Response(null, {status: 301, headers: {location: '/some-page'}}),
      );
    });

    it('does not redirect to absolute URLs', async () => {
      queryMock.mockResolvedValue({urlRedirects: {edges: []}});
      const response = new Response('Not Found', {status: 404});

      await expect(
        storefrontRedirect({
          response,
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/missing?redirect=https://some-page.com',
          ),
        }),
      ).resolves.toEqual(response);

      await expect(
        storefrontRedirect({
          response,
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/missing?redirect=//some-page.com',
          ),
        }),
      ).resolves.toEqual(response);

      await expect(
        storefrontRedirect({
          response,
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/missing?redirect=javascript:alert(1)',
          ),
        }),
      ).resolves.toEqual(response);

      await expect(
        storefrontRedirect({
          response,
          storefront: storefrontMock,
          request: new Request(
            'https://domain.com/missing?redirect=/some-page?param=https://another.com',
          ),
        }),
      ).resolves.toEqual(
        new Response(null, {
          status: 301,
          headers: {location: '/some-page?param=https://another.com'},
        }),
      );

      await expect(
        storefrontRedirect({
          response,
          storefront: storefrontMock,
          request: new Request(
            'http://localhost:3000/missing?return_to=%01http%3A%2F%2Fexample.com',
          ),
        }),
      ).resolves.toEqual(response);
    });
  });
});
