import {setTestStore, test, expect} from '../../fixtures';

/**
 * Failure modes of the consent fetch: the deprecated cookies must survive
 * when no replacement values ever arrive, and a slow consent response must
 * not leak stale values into analytics before it settles.
 */
setTestStore('defaultConsentAllowed_cookiesEnabled');

// The same-origin Storefront API proxy route used by every consent request.
const PROXY_URL_PATTERN = '**/api/unstable/graphql.json';

function isConsentRequest(postData: string | null): boolean {
  return (postData ?? '').includes('consentManagement');
}

test.describe('Consent request failures', () => {
  test('keeps the deprecated cookies when no replacement values ever arrive', async ({
    storefront,
  }) => {
    // No banner: consent is allowed by default, so nothing else interferes.
    await storefront.setWithPrivacyBanner(false);

    // === Establish the session as a new visitor ===
    const initialResponse = await storefront.withConsentResponse(() =>
      storefront.goto('/'),
    );
    const tokens = await storefront.expectAllowedConsent(initialResponse);

    // === Model the returning visitor: only deprecated cookies remain ===
    const storefrontOrigin = new URL(storefront.page.url()).origin;
    await storefront.context.addCookies([
      {name: '_shopify_y', value: tokens.uniqueToken!, url: storefrontOrigin},
      {name: '_shopify_s', value: tokens.visitToken!, url: storefrontOrigin},
    ]);
    await storefront.removeHttpOnlyCookies();

    // === Fail every consent request: Hydrogen's fetch and the script's ===
    let abortedConsentRequests = 0;
    await storefront.page.route(PROXY_URL_PATTERN, (route) => {
      if (!isConsentRequest(route.request().postData())) {
        return route.continue();
      }
      abortedConsentRequests++;
      return route.abort('failed');
    });

    // Load with the page-load fetch failing.
    await storefront.reload();

    // Perf-kit mounts once the (failed) fetch settles, which proves the
    // readiness effect ran and the deletion gate was evaluated — closed.
    await storefront.waitForPerfKit();
    expect(
      abortedConsentRequests,
      'The page-load fetch should have failed',
    ).toBe(1);

    // Fail the consent script's own request too, through the consent API
    // it exposes. Its callback settles once the request failed.
    const consentCallResult = await storefront.page.evaluate(
      () =>
        new Promise<unknown>((resolve) => {
          const customerPrivacy = (window as any).Shopify?.customerPrivacy;
          customerPrivacy?.setTrackingConsent(
            {
              marketing: true,
              analytics: true,
              preferences: true,
              sale_of_data: true,
            },
            (data: unknown) => resolve(data),
          );
        }),
    );
    expect(
      consentCallResult,
      'The script request should have failed',
    ).toMatchObject({error: expect.any(String)});
    expect(
      abortedConsentRequests,
      'Both consent requests should have failed',
    ).toBe(2);

    // The safety gate outcome: no replacement values arrived, so the
    // deprecated cookies must be kept — deleting them would orphan the
    // visitor's session.
    expect((await storefront.getCookie('_shopify_y'))?.value).toBe(
      tokens.uniqueToken,
    );
    expect((await storefront.getCookie('_shopify_s'))?.value).toBe(
      tokens.visitToken,
    );

    // The Customer Privacy API never holds the session's unique token: not
    // from a consent response (all failed). Perf-kit may mint its own
    // fallback token in degraded mode, but that is not this session's value.
    const cachedUniqueToken = await storefront.page.evaluate(
      () => (window as any).Shopify?.customerPrivacy?.cachedToken?._shopify_y,
    );
    expect(cachedUniqueToken).not.toBe(tokens.uniqueToken);

    // === Recovery: consent requests succeed again on the next load ===
    await storefront.page.unroute(PROXY_URL_PATTERN);

    const recoveryResponse = await storefront.withConsentResponse(() =>
      storefront.reload(),
    );

    // The deprecated cookie values were forwarded upstream on the consent
    // request, so the same session continues.
    expect(
      await storefront.expectAllowedConsent(recoveryResponse),
      'Recovery should preserve the original tokens',
    ).toEqual(tokens);

    // The gate opens through the fresh response values: the deprecated
    // cookies are finally removed.
    await storefront.expectNoLegacyAnalyticsCookies();
    await storefront.expectHttpOnlyAnalyticsCookiesPresent();
  });

  test('waits for a slow consent response without leaking stale values', async ({
    storefront,
  }) => {
    // Delay the consent response: analytics readiness and the deletion gate
    // must not act before it settles.
    const CONSENT_DELAY_IN_MILLISECONDS = 3000;

    await storefront.setWithPrivacyBanner(false);

    // === Establish the session as a new visitor ===
    const initialResponse = await storefront.withConsentResponse(() =>
      storefront.goto('/'),
    );
    const tokens = await storefront.expectAllowedConsent(initialResponse);

    // === Model the returning visitor: only deprecated cookies remain ===
    const storefrontOrigin = new URL(storefront.page.url()).origin;
    await storefront.context.addCookies([
      {name: '_shopify_y', value: tokens.uniqueToken!, url: storefrontOrigin},
      {name: '_shopify_s', value: tokens.visitToken!, url: storefrontOrigin},
    ]);
    await storefront.removeHttpOnlyCookies();

    await storefront.page.route(PROXY_URL_PATTERN, async (route) => {
      if (!isConsentRequest(route.request().postData())) {
        return route.continue();
      }
      // Fetch the real response, hold it, then deliver it late.
      const response = await route.fetch();
      await new Promise((resolve) =>
        setTimeout(resolve, CONSENT_DELAY_IN_MILLISECONDS),
      );
      return route.fulfill({response});
    });

    // === Reload with the slow response in flight ===
    storefront.clearRequests();
    await storefront.page.reload();
    await storefront.page.waitForLoadState('domcontentloaded');

    // While the consent response is still in flight: analytics readiness
    // has not been reached (perf-kit is not mounted) and no analytics
    // requests have fired, so nothing can carry stale token values.
    storefront.expectPerfKitNotLoaded();
    storefront.expectNoMonorailRequests();

    // The deletion gate has not opened either: the replacement values have
    // not arrived, so the deprecated cookies are still in place.
    expect((await storefront.getCookie('_shopify_y'))?.value).toBe(
      tokens.uniqueToken,
    );

    // === The slow response settles and everything converges ===
    await storefront.waitForPerfKit();
    await storefront.waitForMonorailRequests();
    storefront.verifyMonorailRequests(
      tokens.uniqueToken,
      tokens.visitToken,
      'after the slow consent response settled',
    );

    // The session continued through the slow response's values, and the
    // deprecated cookies were removed only after it arrived.
    expect(await storefront.getTrackingTokens()).toEqual(tokens);
    await storefront.expectNoLegacyAnalyticsCookies();
    await storefront.expectHttpOnlyAnalyticsCookiesPresent();
  });
});
