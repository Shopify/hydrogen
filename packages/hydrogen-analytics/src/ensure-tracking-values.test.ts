import {describe, it, expect, vi, beforeEach} from 'vitest';
import {ensureTrackingValues} from './ensure-tracking-values';

vi.mock('./utils/tracking-values', () => ({
  getTrackingValues: vi.fn(() => ({
    uniqueToken: 'test-unique',
    visitToken: 'test-visit',
    consent: null,
  })),
}));

describe('ensureTrackingValues', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches from same-origin SFAPI proxy first', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {consentManagement: {cookies: {cookieDomain: '.test.shop'}}},
          }),
        ),
      );

    await ensureTrackingValues(
      'public-token-123456789012345678',
      'checkout.test.shop',
    );

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/unstable/graphql.json',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Shopify-Storefront-Access-Token':
            'public-token-123456789012345678',
          'X-Shopify-VisitToken': 'test-visit',
          'X-Shopify-UniqueToken': 'test-unique',
        }),
      }),
    );
  });

  it('retries with checkoutDomain when same-origin fails', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('same-origin failed'))
      .mockResolvedValueOnce(new Response(JSON.stringify({data: {}})));

    await ensureTrackingValues(
      'public-token-123456789012345678',
      'checkout.test.shop',
    );

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[1][0]).toBe(
      'https://checkout.test.shop/api/unstable/graphql.json',
    );
  });

  it('does not throw when both requests fail', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));

    await expect(
      ensureTrackingValues(
        'public-token-123456789012345678',
        'checkout.test.shop',
      ),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch tracking values'),
      expect.any(String),
    );
    warnSpy.mockRestore();
  });
});