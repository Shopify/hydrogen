import {setTestStore, test, expect} from '../../fixtures';

setTestStore('defaultConsentDisallowed_cookiesEnabled');

test.describe('Privacy Banner - Session Migration', () => {
  test.describe('Consent Allowed (with existing old tracking cookies)', () => {
    test('should preserve tracking values from old cookies after migration', async ({
      storefront,
    }) => {
      // Enable privacy banner via JS bundle interception (preserves server-timing)
      await storefront.setWithPrivacyBanner(true);

      // === SETUP: Establish consent and get initial tracking values ===

      // 1. Navigate to main page
      await storefront.goto('/');

      // 2. Accept privacy banner to establish consent
      await storefront.acceptPrivacyBanner();

      // 3. Get the established Y/S values after consent
      const establishedServerTiming = await storefront.getServerTimingValues(
        true,
      );

      // Verify they are real UUIDs (not mock values)
      storefront.expectRealServerTimingValues(establishedServerTiming);

      const originalYValue = establishedServerTiming._y!;
      const originalSValue = establishedServerTiming._s!;

      // 4. Verify all cookies are present
      const {shopifyY, shopifyS} =
        await storefront.expectAnalyticsCookiesPresent();

      expect(shopifyY!.value, '_shopify_y should match server-timing').toBe(
        originalYValue,
      );
      expect(shopifyS!.value, '_shopify_s should match server-timing').toBe(
        originalSValue,
      );

      // === MIGRATION: Remove new cookies but keep old ones ===

      // 5. Remove ONLY the new HTTP-only cookies (simulate migration scenario)
      // Keep: _shopify_y, _shopify_s (old tracking cookies)
      // Remove: _shopify_analytics, _shopify_marketing, _shopify_essential(s)
      await storefront.removeHttpOnlyCookies();

      // Verify HTTP-only cookies are removed
      const analyticsAfterRemoval = await storefront.getCookie(
        '_shopify_analytics',
      );
      const marketingAfterRemoval = await storefront.getCookie(
        '_shopify_marketing',
      );

      expect(
        analyticsAfterRemoval,
        '_shopify_analytics should be removed',
      ).toBeUndefined();
      expect(
        marketingAfterRemoval,
        '_shopify_marketing should be removed',
      ).toBeUndefined();

      // Verify old tracking cookies are still present
      const yAfterRemoval = await storefront.getCookie('_shopify_y');
      const sAfterRemoval = await storefront.getCookie('_shopify_s');

      expect(yAfterRemoval, '_shopify_y should still exist').toBeDefined();
      expect(sAfterRemoval, '_shopify_s should still exist').toBeDefined();
      expect(yAfterRemoval!.value, '_shopify_y value should be unchanged').toBe(
        originalYValue,
      );
      expect(sAfterRemoval!.value, '_shopify_s value should be unchanged').toBe(
        originalSValue,
      );

      // Clear tracked requests before reload
      storefront.clearRequests();

      // 6. Reload the page - this initiates the migration test
      await storefront.page.reload();
      await storefront.page.waitForLoadState('networkidle');

      // === VERIFY: Tracking values should be preserved after migration ===

      // 7. Privacy banner should NOT show (consent was previously saved)
      await storefront.expectPrivacyBannerNotVisible();

      // 8. Verify server-timing Y/S values match the original established values
      const serverTimingAfterReload = await storefront.getServerTimingValues();

      expect(
        serverTimingAfterReload._y,
        'Server-timing _y after migration should match original value',
      ).toBe(originalYValue);
      expect(
        serverTimingAfterReload._s,
        'Server-timing _s after migration should match original value',
      ).toBe(originalSValue);

      // 9. Verify new HTTP-only cookies are recreated with correct values
      const {
        shopifyY: yAfterReload,
        shopifyS: sAfterReload,
        shopifyAnalytics: analyticsAfterReload,
        shopifyMarketing: marketingAfterReload,
      } = await storefront.expectAnalyticsCookiesPresent();

      expect(
        analyticsAfterReload,
        '_shopify_analytics should be recreated after migration',
      ).toBeDefined();
      expect(
        marketingAfterReload,
        '_shopify_marketing should be recreated after migration',
      ).toBeDefined();

      // Verify cookie values match original tracking session
      expect(
        yAfterReload!.value,
        '_shopify_y should keep original value after migration',
      ).toBe(originalYValue);
      expect(
        sAfterReload!.value,
        '_shopify_s should keep original value after migration',
      ).toBe(originalSValue);

      // 10. Wait for analytics requests and verify they use original tracking values
      await storefront.waitForPerfKit();
      await storefront.waitForMonorailRequests();

      storefront.verifyMonorailRequests(
        originalYValue,
        originalSValue,
        'after migration',
      );
    });
  });

  test.describe('Consent Declined (no existing tracking cookies)', () => {
    test('should not send analytics or set tracking params when consent was declined', async ({
      storefront,
    }) => {
      // Enable privacy banner via JS bundle interception (preserves server-timing)
      await storefront.setWithPrivacyBanner(true);

      // === SETUP: Decline consent ===

      // 1. Navigate to main page
      await storefront.goto('/');

      // 2. Decline privacy banner
      await storefront.declinePrivacyBanner();

      // 3. Verify _shopify_essential cookie is set after declining
      await storefront.expectEssentialCookiePresent();

      // 4. Verify analytics cookies are NOT set
      await storefront.expectNoAnalyticsCookies();

      // === MIGRATION: Remove new cookies AND old tracking cookies ===

      // 5. Remove HTTP-only cookies AND _shopify_y and _shopify_s
      // This simulates a migration where user had declined consent and
      // we're testing the system handles missing tracking cookies correctly
      await storefront.removeHttpOnlyCookies();
      await storefront.removeCookies(['_shopify_y', '_shopify_s']);

      // Verify all tracking-related cookies are removed
      const yAfterRemoval = await storefront.getCookie('_shopify_y');
      const sAfterRemoval = await storefront.getCookie('_shopify_s');
      const analyticsAfterRemoval = await storefront.getCookie(
        '_shopify_analytics',
      );
      const marketingAfterRemoval = await storefront.getCookie(
        '_shopify_marketing',
      );

      expect(yAfterRemoval, '_shopify_y should be removed').toBeUndefined();
      expect(sAfterRemoval, '_shopify_s should be removed').toBeUndefined();
      expect(
        analyticsAfterRemoval,
        '_shopify_analytics should be removed',
      ).toBeUndefined();
      expect(
        marketingAfterRemoval,
        '_shopify_marketing should be removed',
      ).toBeUndefined();

      // Clear tracked requests before reload
      storefront.clearRequests();

      // 6. Reload the page - this initiates the migration test
      await storefront.page.reload();
      await storefront.page.waitForLoadState('networkidle');

      // === VERIFY: No tracking should occur ===

      // 7. Privacy banner should NOT show (consent choice was previously saved)
      await storefront.expectPrivacyBannerNotVisible();

      // 8. Verify server-timing values are mock values (not real tracking values)
      const serverTimingAfterReload = await storefront.getServerTimingValues();
      storefront.expectMockServerTimingValues(serverTimingAfterReload);

      // 9. Verify analytics cookies are still NOT present
      await storefront.expectNoAnalyticsCookies();

      // 10. Wait for perf-kit to load (it should still load for performance metrics)
      await storefront.waitForPerfKit();

      // 11. Wait and verify NO Monorail analytics requests are made
      await storefront.page.waitForTimeout(1500);
      storefront.expectNoMonorailRequests();
    });
  });
});
