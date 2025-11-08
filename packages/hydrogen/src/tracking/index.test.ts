import {describe, it, expect} from 'vitest';
import {setTrackingCookies} from './index';

describe('setTrackingCookies', () => {
  it('sets Shopify tracking cookies', () => {
    // Mock request object. A real Request instance would remove the 'cookie' header.
    const request = {
      headers: new Headers([
        ['cookie', '_shopify_y=visitor123; _shopify_s=session456'],
      ]),
    };

    const response = new Response(null);
    setTrackingCookies(request, response);
    const cookie = response.headers.get('Set-Cookie');

    expect(cookie).toMatch('_shopify_marketing_remote=');
    expect(cookie).toMatch('_shopify_analytics_remote=');
    const marketing = cookie?.match(/_shopify_marketing_remote=([^;]+);/)?.[1];
    const analytics = cookie?.match(/_shopify_analytics_remote=([^;]+);/)?.[1];
    expect(marketing && analytics).not.toBeNull();

    expect(JSON.parse(atob(marketing!))).toEqual(
      expect.objectContaining({
        visitorToken: expect.objectContaining({
          value: 'visitor123',
          expires: expect.any(Number),
        }),
        sessionToken: expect.objectContaining({
          value: 'session456',
          expires: expect.any(Number),
        }),
      }),
    );
    expect(JSON.parse(atob(analytics!))).toEqual(
      expect.objectContaining({
        visitorToken: expect.objectContaining({
          value: 'visitor123',
          expires: expect.any(Number),
        }),
        sessionToken: expect.objectContaining({
          value: 'session456',
          expires: expect.any(Number),
        }),
      }),
    );
  });
});
