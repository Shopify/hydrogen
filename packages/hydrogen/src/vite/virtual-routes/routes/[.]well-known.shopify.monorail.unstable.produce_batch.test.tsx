import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {
  action,
  loader,
} from './[.]well-known.shopify.monorail.unstable.produce_batch';

const SHOPIFY_STORE_DOMAIN = 'hydrogen-preview.myshopify.com';

describe('Monorail analytics proxy route', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('proxies POST requests to Shopify theme domain when PUBLIC_STORE_DOMAIN is set', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('Monorail Events Array cannot be empty.', {
        status: 400,
        headers: new Headers({
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Methods': 'OPTIONS,POST',
        }),
      }),
    );
    global.fetch = mockFetch;

    const request = new Request(
      'http://localhost/.well-known/shopify/monorail/unstable/produce_batch',
      {
        method: 'POST',
        headers: {'Content-Type': 'text/plain'},
        body: JSON.stringify({
          events: [
            {
              schema_id: 'trekkie_storefront_page_view/1.4',
              payload: {shopId: 12345, pageType: 'home'},
            },
          ],
          metadata: {event_sent_at_ms: Date.now()},
        }),
      },
    );

    const context = {
      env: {SHOPIFY_STORE_DOMAIN},
    };

    // @ts-expect-error - partial context for testing
    const response = await action({request, context});

    expect(mockFetch).toHaveBeenCalledWith(
      'https://hydrogen-preview.myshopify.com/.well-known/shopify/monorail/unstable/produce_batch',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'text/plain',
        }),
      }),
    );

    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toBe('Monorail Events Array cannot be empty.');
  });

  it('returns 405 Method Not Allowed for GET requests', async () => {
    const response = await loader();

    expect(response.status).toBe(405);

    const text = await response.text();
    expect(text).toBe('Method not allowed');
  });

  it('returns 204 fallback when PUBLIC_STORE_DOMAIN is not set', async () => {
    const request = new Request(
      'http://localhost/.well-known/shopify/monorail/unstable/produce_batch',
      {
        method: 'POST',
        headers: {'Content-Type': 'text/plain'},
        body: JSON.stringify({events: []}),
      },
    );

    const context = {env: {}};

    // @ts-expect-error - partial context for testing
    const response = await action({request, context});

    expect(response.status).toBe(204);
    const text = await response.text();
    expect(text).toBe('');
  });

  it('returns 204 and logs error when proxy fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const request = new Request(
      'http://localhost/.well-known/shopify/monorail/unstable/produce_batch',
      {
        method: 'POST',
        body: JSON.stringify({events: []}),
      },
    );

    const context = {
      env: {SHOPIFY_STORE_DOMAIN},
    };

    // @ts-expect-error - partial context for testing
    const response = await action({request, context});

    expect(response.status).toBe(204);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Monorail Proxy] Error forwarding to Shopify theme:',
      expect.any(Error),
    );
  });

  it('forwards request with correct headers and body', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response('{"status": "ok"}', {status: 200}));
    global.fetch = mockFetch;

    const payload = {
      events: [{schema_id: 'test', payload: {data: 'value'}}],
      metadata: {event_sent_at_ms: 123456},
    };

    const request = new Request(
      'http://localhost/.well-known/shopify/monorail/unstable/produce_batch',
      {
        method: 'POST',
        headers: {'Content-Type': 'text/plain'},
        body: JSON.stringify(payload),
      },
    );

    const context = {
      env: {SHOPIFY_STORE_DOMAIN},
    };

    // @ts-expect-error - partial context for testing
    await action({request, context});

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0]).toBe(
      `https://${SHOPIFY_STORE_DOMAIN}/.well-known/shopify/monorail/unstable/produce_batch`,
    );
    expect(fetchCall[1]).toMatchObject({
      method: 'POST',
      headers: {'Content-Type': 'text/plain'},
      body: JSON.stringify(payload),
    });
  });

  it('forwards all response headers and status from Shopify theme', async () => {
    const shopifyHeaders = new Headers({
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
      'Access-Control-Allow-Credentials': 'true',
      'x-request-id': 'test-request-id',
      'x-robots-tag': 'noindex',
      'x-shopify-location': 'us-east',
    });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response('Monorail Events Array cannot be empty.', {
        status: 400,
        headers: shopifyHeaders,
      }),
    );
    global.fetch = mockFetch;

    const request = new Request(
      'http://localhost/.well-known/shopify/monorail/unstable/produce_batch',
      {
        method: 'POST',
        body: JSON.stringify({events: []}),
      },
    );

    const context = {
      env: {SHOPIFY_STORE_DOMAIN},
    };

    // @ts-expect-error - partial context for testing
    const response = await action({request, context});

    expect(response.status).toBe(400);

    const text = await response.text();
    expect(text).toBe('Monorail Events Array cannot be empty.');

    expect(response.headers.get('Content-Type')).toBe(
      'text/plain; charset=utf-8',
    );
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'OPTIONS,POST',
    );
    expect(response.headers.get('x-request-id')).toBe('test-request-id');
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
  });

  it('successfully proxies valid Hydrogen analytics payload structure', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('{"result":[{"status":200,"message":"ok"}]}', {
        status: 200,
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      }),
    );
    global.fetch = mockFetch;

    const validHydrogenPayload = {
      events: [
        {
          schema_id: 'trekkie_storefront_page_view/1.4',
          payload: {
            shopId: 1,
            currency: 'USD',
            uniqToken: 'test-unique-token',
            visitToken: 'test-visit-token',
            microSessionId: 'test-micro-session-id',
            microSessionCount: 1,
            url: 'https://shop.com',
            path: '/',
            search: '',
            referrer: '',
            title: 'Home Page',
            appClientId: '12875497473',
            isMerchantRequest: false,
            hydrogenSubchannelId: '0',
            isPersistentCookie: true,
            contentLanguage: 'en',
          },
          metadata: {
            event_created_at_ms: Date.now(),
          },
        },
      ],
      metadata: {
        event_sent_at_ms: Date.now(),
      },
    };

    const request = new Request(
      'http://localhost/.well-known/shopify/monorail/unstable/produce_batch',
      {
        method: 'POST',
        headers: {'Content-Type': 'text/plain'},
        body: JSON.stringify(validHydrogenPayload),
      },
    );

    const context = {
      env: {SHOPIFY_STORE_DOMAIN},
    };

    // @ts-expect-error - partial context for testing
    const response = await action({request, context});

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({result: [{status: 200, message: 'ok'}]});
  });
});
