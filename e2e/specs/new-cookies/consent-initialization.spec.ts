import {setTestStore, test, expect} from '../../fixtures';

/**
 * The Customer Privacy API owns consent initialization: it sends one
 * same-origin consent request per full page load through Hydrogen's Storefront
 * API proxy, and Hydrogen no longer exposes tracking values in Server-Timing.
 */
const TRACKING_SERVER_TIMING_NAMES = ['_y', '_s', '_cmp', '_server_tracking'];

for (const [storeKey, withPrivacyBanner] of [
  ['defaultConsentAllowed_cookiesEnabled', false],
  ['defaultConsentDisallowed_cookiesEnabled', true],
] as const) {
  test.describe(`Consent initialization (${storeKey}, banner: ${withPrivacyBanner})`, () => {
    setTestStore(storeKey);

    test('sends one same-origin consent request per full page load', async ({
      storefront,
    }) => {
      await storefront.setWithPrivacyBanner(withPrivacyBanner);
      const consentRequests = storefront.trackConsentRequests();

      await storefront.goto('/');
      await storefront.waitForConsentLoaded();
      await storefront.reload();
      await storefront.waitForConsentLoaded();

      // Client-side navigations reuse the page's initialized consent.
      const catalogLink = storefront.page
        .locator('a[href="/collections/all"]:visible')
        .first();
      await catalogLink.click();
      await expect(storefront.page).toHaveURL(/\/collections\/all/);

      expect(consentRequests).toEqual([
        {sameOrigin: true, hasMarkerHeader: true, hasCookieHeader: true},
        {sameOrigin: true, hasMarkerHeader: true, hasCookieHeader: true},
      ]);
    });

    test('configures async consent and keeps tracking values out of Server-Timing', async ({
      storefront,
    }) => {
      await storefront.setWithPrivacyBanner(withPrivacyBanner);
      const consentResponse = await storefront.withConsentResponse(() =>
        storefront.goto('/'),
      );
      await storefront.waitForConsentLoaded();

      const config = await storefront.page.evaluate(
        () => (window as any).Shopify.customerPrivacy.config,
      );
      expect(config).toMatchObject({
        isHeadless: true,
        asyncConsent: true,
        asyncVisitorState: true,
        consentDomain: new URL(storefront.page.url()).host,
        debug: {hydrogen: {generation: 2, serverTiming: false}},
      });

      const navigationServerTiming = await storefront.page.evaluate(() =>
        (
          performance.getEntriesByType(
            'navigation',
          )[0] as PerformanceNavigationTiming
        ).serverTiming.map((entry) => entry.name),
      );
      expect(navigationServerTiming).toContain('_sfapi_proxy');
      expect(
        navigationServerTiming.filter((name) =>
          TRACKING_SERVER_TIMING_NAMES.includes(name),
        ),
      ).toEqual([]);

      // The proxy strips upstream Server-Timing from the consent response.
      expect(await consentResponse.headerValue('server-timing')).toBeNull();

      await storefront.expectNoLegacyAnalyticsCookies();
    });
  });
}
