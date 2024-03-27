import {describe, it, expect, vi} from 'vitest';
import type {Storefront} from '../storefront';
import {storefrontRedirect} from './redirect';

describe('storefrontRedirect', () => {
  const shopifyDomain = 'https://domain.myshopify.com';
  const queryMock = vi.fn();
  const storefrontMock = {
    getShopifyDomain: () => shopifyDomain,
    query: queryMock,
  } as unknown as Storefront;

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

  it('strips remix _data query parameter on soft navigations', async () => {
    queryMock.mockResolvedValueOnce({
      urlRedirects: {edges: [{node: {target: shopifyDomain + '/some-page'}}]},
    });

    await expect(
      storefrontRedirect({
        storefront: storefrontMock,
        request: new Request(
          'https://domain.com/some-page?_data=%2Fcollections%2Fbackcountry',
        ),
      }),
    ).resolves.toEqual(
      new Response(null, {
        status: 200,
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

  it('matches query parameters', async () => {
    queryMock.mockResolvedValueOnce({
      urlRedirects: {edges: [{node: {target: shopifyDomain + '/some-page'}}]},
    });

    await expect(
      storefrontRedirect({
        storefront: storefrontMock,
        request: new Request(
          'https://domain.com/some-page?test=true&_data=%2Fcollections%2Fbackcountry',
        ),
        matchQueryParams: true,
      }),
    ).resolves.toEqual(
      new Response(null, {
        status: 200,
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

  it('propogates query parameters to the final redirect', async () => {
    queryMock.mockResolvedValueOnce({
      urlRedirects: {
        edges: [
          {node: {target: shopifyDomain + '/some-redirect?redirectParam=true'}},
        ],
      },
    });

    await expect(
      storefrontRedirect({
        storefront: storefrontMock,
        request: new Request(
          'https://domain.com/some-page?requestParam=true&_data=%2Fcollections%2Fbackcountry',
        ),
      }),
    ).resolves.toEqual(
      new Response(null, {
        status: 200,
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

  it('propogates query parameters to the final redirect for relative URLs', async () => {
    queryMock.mockResolvedValueOnce({
      urlRedirects: {
        edges: [{node: {target: '/some-redirect?redirectParam=true'}}],
      },
    });

    await expect(
      storefrontRedirect({
        storefront: storefrontMock,
        request: new Request(
          'https://domain.com/some-page?requestParam=true&_data=%2Fcollections%2Fbackcountry',
        ),
      }),
    ).resolves.toEqual(
      new Response(null, {
        status: 200,
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

  it('queries the SFAPI and returns 404 on mismatch', async () => {
    queryMock.mockResolvedValueOnce({urlRedirects: {edges: []}});
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
    it('uses the "redirect" serach param as a fallback', async () => {
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

    it('uses the "return_to" serach param as a fallback', async () => {
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
