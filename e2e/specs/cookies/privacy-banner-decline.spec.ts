import {setTestStore, test, expect} from '../../fixtures';

setTestStore('defaultConsentDisallowed_cookiesEnabled');

test.describe('Privacy Banner - Decline Flow', () => {
  test('should not set analytics cookies or make analytics requests when user declines consent', async ({
    storefront,
  }) => {
    // Enable privacy banner via JS bundle interception (preserves server-timing)
    await storefront.setWithPrivacyBanner(true);

    // 1. Navigate to main page
    await storefront.goto('/');

    // 2. Check that server-timing values (_y and _s) are available via Performance API
    const initialServerTimingValues = await storefront.getServerTimingValues();

    expect(
      initialServerTimingValues._y,
      'Initial _y value should be present in server-timing',
    ).toBeTruthy();
    expect(
      initialServerTimingValues._s,
      'Initial _s value should be present in server-timing',
    ).toBeTruthy();
    expect(initialServerTimingValues._y!.length).toBeGreaterThan(0);
    expect(initialServerTimingValues._s!.length).toBeGreaterThan(0);

    // 3. Verify no analytics cookies are set yet and no analytics requests have been made
    await storefront.expectNoAnalyticsCookies();
    storefront.expectNoAnalyticsRequests();

    // 4. Verify perf-kit script is not downloaded yet
    storefront.expectNoPerfKitRequests();

    // 5. Verify privacy banner appears and click decline
    await storefront.declinePrivacyBanner();

    // 6. Verify _shopify_essential cookie is set after declining
    await storefront.expectEssentialCookiePresent();

    // 7. Verify analytics/marketing cookies are NOT set after declining
    await storefront.expectNoAnalyticsCookies();

    // 8. Verify server-timing values after decline are either absent or contain mock values
    const updatedServerTimingValues =
      await storefront.getServerTimingValues(true);
    storefront.expectMockServerTimingValues(updatedServerTimingValues);

    // 9. Verify perf-kit is downloaded after declining
    await storefront.waitForPerfKit();

    expect(
      storefront.perfKitRequests.length,
      'Perf-kit script should be downloaded after declining consent',
    ).toBeGreaterThan(0);

    // 10. Wait and verify no analytics requests are made
    await storefront.page.waitForTimeout(1500);

    storefront.expectNoAnalyticsRequests();

    // 11. Navigate to first product and add to cart to verify server-timing mock values
    await storefront.navigateToFirstProduct();

    // Add item to cart
    await storefront.addToCart();

    // Check server-timing from the latest resource (cart mutation response)
    const serverTimingAfterCart = await storefront.getServerTimingValues(true);

    // Server-timing _y and _s should be mock values after cart action (consent was declined)
    storefront.expectMockServerTimingValues(serverTimingAfterCart);

    // Verify still no analytics requests after cart action
    storefront.expectNoAnalyticsRequests();

    // 12. Verify checkout URLs contain MOCK tracking params (consent declined)
    await storefront.expectMockCheckoutUrlTrackingParams(
      'in cart drawer after declining consent',
    );

    // 13. Reload the page to verify persistence
    await storefront.reload();

    // Verify privacy banner does NOT show up on reload (consent was saved)
    await storefront.expectPrivacyBannerNotVisible();

    // Verify _shopify_essential cookie persists after reload
    await storefront.expectEssentialCookiePresent();

    // Verify analytics cookies are still not present after reload
    await storefront.expectNoAnalyticsCookies();

    // Wait for perf-kit to be downloaded after reload
    await storefront.waitForPerfKit();

    // Wait and verify no analytics requests after reload
    await storefront.page.waitForTimeout(1500);

    storefront.expectNoAnalyticsRequests();
  });
});
