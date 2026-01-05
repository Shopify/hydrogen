import {setTestStore, test, expect} from '../../fixtures';

setTestStore('defaultConsentDisallowed_cookiesEnabled');

test.describe('Privacy Banner - Consent Change', () => {
  test.describe('Accept → Decline', () => {
    test('should stop analytics when user revokes consent', async ({
      storefront,
    }) => {
      // Enable privacy banner via JS bundle interception
      await storefront.setWithPrivacyBanner(true);

      // === SETUP: Accept consent initially ===

      // 1. Navigate to main page
      await storefront.goto('/');

      // 2. Accept privacy banner to establish consent
      await storefront.acceptPrivacyBanner();

      // 3. Get the established Y/S values after consent
      const establishedServerTiming =
        await storefront.getServerTimingValues(true);

      // Verify they are real UUIDs (not mock values)
      storefront.expectRealServerTimingValues(establishedServerTiming);

      const originalYValue = establishedServerTiming._y!;
      const originalSValue = establishedServerTiming._s!;

      // 4. Verify all analytics cookies are present
      const {shopifyY, shopifyS, shopifyAnalytics, shopifyMarketing} =
        await storefront.expectAnalyticsCookiesPresent();

      expect(shopifyY!.value, '_shopify_y should match server-timing').toBe(
        originalYValue,
      );
      expect(shopifyS!.value, '_shopify_s should match server-timing').toBe(
        originalSValue,
      );
      expect(
        shopifyAnalytics,
        '_shopify_analytics should be present after accept',
      ).toBeDefined();
      expect(
        shopifyMarketing,
        '_shopify_marketing should be present after accept',
      ).toBeDefined();

      // 5. Wait for analytics to fire to confirm tracking is working
      await storefront.waitForPerfKit();
      await storefront.waitForMonorailRequests();

      // Verify analytics requests have correct tracking values
      storefront.verifyMonorailRequests(
        originalYValue,
        originalSValue,
        'after initial accept',
      );

      // Clear tracked requests before consent change
      storefront.clearRequests();

      // === CONSENT CHANGE: Decline via preferences ===

      // 6. Open privacy preferences and decline consent
      await storefront.openPrivacyPreferences();
      await storefront.declineInPreferences();

      // 7. Verify _shopify_essential cookie is set after declining
      await storefront.expectEssentialCookiePresent();

      // 8. Verify analytics/marketing cookies are no longer valid (cleared or invalidated)
      await storefront.expectNoAnalyticsCookies();

      // 9. Verify server-timing values are now mock values (consent revoked)
      const serverTimingAfterDecline =
        await storefront.getServerTimingValues(true);
      storefront.expectMockServerTimingValues(serverTimingAfterDecline);

      // 10. Wait and verify no NEW analytics requests are made after revoking consent
      await storefront.page.waitForTimeout(1500);
      storefront.expectNoMonorailRequests();

      // 11. Navigate to a product page to verify no tracking on navigation
      await storefront.navigateToFirstProduct();

      // Still no analytics requests after navigation
      storefront.expectNoMonorailRequests();

      // 12. Add to cart and verify checkout URLs have mock tracking params
      await storefront.addToCart();
      await storefront.expectNoCheckoutUrlTrackingParams(
        'after revoking consent',
      );

      // 13. Reload the page to verify persistence
      await storefront.reload();

      // Verify privacy banner does NOT show (consent choice was saved)
      await storefront.expectPrivacyBannerNotVisible();

      // Verify analytics cookies are still not present after reload
      await storefront.expectNoAnalyticsCookies();

      // Verify essential cookie persists
      await storefront.expectEssentialCookiePresent();

      // Wait and verify no analytics requests after reload
      await storefront.waitForPerfKit();
      await storefront.page.waitForTimeout(1500);
      storefront.expectNoMonorailRequests();
    });
  });

  test.describe('Decline → Accept', () => {
    test('should start analytics when user grants consent', async ({
      storefront,
    }) => {
      // Enable privacy banner via JS bundle interception (preserves server-timing)
      await storefront.setWithPrivacyBanner(true);

      // === SETUP: Decline consent initially ===

      // 1. Navigate to main page
      await storefront.goto('/');

      // 2. Decline privacy banner
      await storefront.declinePrivacyBanner();

      // 3. Verify _shopify_essential cookie is set after declining
      await storefront.expectEssentialCookiePresent();

      // 4. Verify no analytics cookies are present
      await storefront.expectNoAnalyticsCookies();

      // 5. Verify server-timing values are mock values
      const initialServerTiming = await storefront.getServerTimingValues(true);
      storefront.expectMockServerTimingValues(initialServerTiming);

      // 6. Wait for perf-kit to load but verify no analytics requests
      await storefront.waitForPerfKit();
      await storefront.page.waitForTimeout(1500);
      storefront.expectNoMonorailRequests();

      // Clear tracked requests before consent change
      storefront.clearRequests();

      // === CONSENT CHANGE: Accept via preferences ===

      // 7. Open privacy preferences and accept consent
      await storefront.openPrivacyPreferences();
      await storefront.acceptInPreferences();

      // 8. Verify server-timing values changed to real UUIDs after consent
      const serverTimingAfterAccept =
        await storefront.getServerTimingValues(true);

      storefront.expectRealServerTimingValues(serverTimingAfterAccept);

      const newYValue = serverTimingAfterAccept._y!;
      const newSValue = serverTimingAfterAccept._s!;

      // 9. Verify analytics cookies are now present
      const {shopifyY, shopifyS, shopifyAnalytics, shopifyMarketing} =
        await storefront.expectAnalyticsCookiesPresent();

      // Cookie values should match the new server-timing values
      expect(
        shopifyY!.value,
        '_shopify_y cookie should match new server-timing _y value',
      ).toBe(newYValue);

      expect(
        shopifyS!.value,
        '_shopify_s cookie should match new server-timing _s value',
      ).toBe(newSValue);

      // Verify HTTP-only cookies are set
      expect(
        shopifyAnalytics,
        '_shopify_analytics cookie should be present after accepting',
      ).toBeDefined();
      expect(
        shopifyMarketing,
        '_shopify_marketing cookie should be present after accepting',
      ).toBeDefined();

      // 10. Wait for analytics requests to fire after granting consent
      await storefront.waitForMonorailRequests();

      // Verify analytics requests contain the correct tracking values
      storefront.verifyMonorailRequests(
        newYValue,
        newSValue,
        'after granting consent via preferences',
      );

      // 11. Navigate to a product page
      await storefront.finalizePerfKitMetrics();
      await storefront.navigateToFirstProduct();

      // Note: We skip perf-kit request verification here because it captures Y/S values
      // only when its script is first downloaded so it won't update the values after changing
      // consent mid-session. This is a bug in perf-kit that needs to be fixed separately.
      // The Monorail requests above already verify tracking is working correctly.

      // 12. Add to cart and verify checkout URLs have real tracking params
      await storefront.addToCart();
      await storefront.verifyCheckoutUrlTrackingParams(
        newYValue,
        newSValue,
        'after granting consent',
      );

      // 13. Reload the page to verify persistence
      await storefront.reload();

      // Verify privacy banner does NOT show (consent choice was saved)
      await storefront.expectPrivacyBannerNotVisible();

      // Verify cookies persist after reload
      const cookiesAfterReload =
        await storefront.expectAnalyticsCookiesPresent();

      // Verify server-timing values match
      const serverTimingAfterReload = await storefront.getServerTimingValues();

      expect(
        serverTimingAfterReload._y,
        'Server-timing _y after reload should match value from before reload',
      ).toBe(newYValue);
      expect(
        serverTimingAfterReload._s,
        'Server-timing _s after reload should match value from before reload',
      ).toBe(newSValue);

      // Cookies should also match
      expect(
        cookiesAfterReload.shopifyY?.value,
        '_shopify_y cookie after reload should match server-timing _y',
      ).toBe(newYValue);
      expect(
        cookiesAfterReload.shopifyS?.value,
        '_shopify_s cookie after reload should match server-timing _s',
      ).toBe(newSValue);

      // Wait for analytics requests after reload
      await storefront.waitForMonorailRequests();

      // Verify analytics events after reload have correct values
      storefront.verifyMonorailRequests(
        newYValue,
        newSValue,
        'after reload with consent granted',
      );
    });
  });
});
