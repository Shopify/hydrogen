import {setTestStore, test, expect, ACCEPT_ALL_CONSENT} from '../../fixtures';

/**
 * Failure modes of the Customer Privacy API's consent request. Analytics wait
 * for consent to load, so a failed or slow request must never release them
 * early or with stale values, and legacy cookies are expired only after a
 * successful response.
 */
setTestStore('defaultConsentAllowed_cookiesEnabled');

// The same-origin Storefront API proxy route used by every consent request.
const PROXY_URL_PATTERN = '**/api/unstable/graphql.json';

function isConsentRequest(postData: string | null): boolean {
  return (postData ?? '').includes('consentManagement');
}

test.describe('Consent request failures', () => {
  test('keeps analytics and legacy cookies on hold until consent loads', async ({
    storefront,
  }) => {
    await storefront.setWithPrivacyBanner(false);

    // === A returning visitor with only legacy cookies ===
    await storefront.goto('/');
    await storefront.waitForConsentLoaded();
    const legacy = await storefront.setTrackingConsent(ACCEPT_ALL_CONSENT);
    await storefront.seedLegacyVisitor(legacy);

    // === Every consent request fails on this load ===
    let failedConsentRequests = 0;
    await storefront.page.route(PROXY_URL_PATTERN, (route) => {
      if (!isConsentRequest(route.request().postData())) {
        return route.continue();
      }
      failedConsentRequests++;
      return route.abort('failed');
    });
    await storefront.reload();
    await expect.poll(() => failedConsentRequests).toBeGreaterThan(0);

    // Consent never loaded: no analytics, no PerfKit, and the legacy cookies
    // stay in place for the next attempt.
    expect(
      await storefront.page.evaluate(
        () => window.Shopify?.customerPrivacy?.consentStatus,
      ),
    ).not.toBe('loaded');
    storefront.expectNoMonorailRequests();
    storefront.expectPerfKitNotLoaded();
    expect(
      (await storefront.getCookies())
        .map((cookie) => cookie.name)
        .filter(
          (name) =>
            name.startsWith('_tracking_consent') ||
            /^_shopify_[ys]$/.test(name),
        )
        .sort(),
    ).toEqual(['_shopify_s', '_shopify_y', '_tracking_consent']);

    // Client-side navigation does not release analytics without consent.
    await storefront.page
      .locator('a[href="/collections/all"]:visible')
      .first()
      .click();
    await expect(storefront.page).toHaveURL(/\/collections\/all/);
    storefront.expectNoMonorailRequests();

    // === Recovery: a successful consent update releases analytics ===
    await storefront.page.unroute(PROXY_URL_PATTERN);
    await storefront.setTrackingConsent(ACCEPT_ALL_CONSENT);
    await storefront.waitForPerfKit();
    await storefront.waitForMonorailRequests();
    storefront.verifyMonorailRequests(
      legacy.uniqueToken!,
      legacy.visitToken!,
      'after recovering consent',
    );
    await storefront.expectNoLegacyCookies();
  });

  test('waits for a slow consent response without leaking stale values', async ({
    storefront,
  }) => {
    // Delay the consent response: analytics and legacy-cookie expiry must
    // wait for it.
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

    // The legacy cookies are still in place: they are expired only after a
    // successful consent response.
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
