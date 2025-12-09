import {setTestStore, test, expect} from '../../fixtures';

setTestStore('defaultConsentAllowed_cookiesEnabled');

test.describe('Consent Tracking - Auto-Allowed (Consent Allowed by Default)', () => {
  test('should set analytics cookies and fire analytics requests immediately when consent is allowed by default', async ({
    storefront,
  }) => {
    // Enable privacy banner setting (but banner shouldn't show since consent is auto-allowed)
    await storefront.setWithPrivacyBanner(true);

    // 1. Navigate to main page
    await storefront.goto('/');

    // 2. Verify privacy banner does NOT appear (consent is already allowed by default)
    await storefront.expectPrivacyBannerNotVisible();

    // 3. Check server-timing values from navigation - these should be real UUIDs
    const navigationServerTiming = await storefront.getServerTimingValues();

    expect(
      navigationServerTiming._y,
      '_y value should be present in server-timing',
    ).toBeTruthy();
    expect(
      navigationServerTiming._s,
      '_s value should be present in server-timing',
    ).toBeTruthy();

    // Verify they are real UUIDs (not mock values)
    storefront.expectRealServerTimingValues(navigationServerTiming);

    // 4. Verify analytics cookies are set immediately (no user action needed)
    const {shopifyY, shopifyS, shopifyAnalytics, shopifyMarketing} =
      await storefront.expectAnalyticsCookiesPresent();

    // Cookie values should match navigation server-timing values
    // (unlike accept flow, values shouldn't change - consent was already allowed)
    expect(
      shopifyY!.value,
      '_shopify_y cookie value should match navigation server-timing _y value',
    ).toBe(navigationServerTiming._y);

    expect(
      shopifyS!.value,
      '_shopify_s cookie value should match navigation server-timing _s value',
    ).toBe(navigationServerTiming._s);

    // Verify HTTP-only cookies are set
    expect(
      shopifyAnalytics,
      '_shopify_analytics cookie should be present',
    ).toBeDefined();
    expect(
      shopifyMarketing,
      '_shopify_marketing cookie should be present',
    ).toBeDefined();

    // Verify HTTP-only cookies have httpOnly flag set
    expect(
      shopifyAnalytics!.httpOnly,
      '_shopify_analytics cookie should be HTTP-only',
    ).toBe(true);
    expect(
      shopifyMarketing!.httpOnly,
      '_shopify_marketing cookie should be HTTP-only',
    ).toBe(true);

    // 5. Wait for perf-kit to download and analytics requests to fire
    await storefront.waitForPerfKit();
    storefront.expectPerfKitLoaded();

    // Wait for Monorail analytics requests
    await storefront.waitForMonorailRequests();

    // Verify the analytics requests contain the correct tracking values
    storefront.verifyMonorailRequests(
      navigationServerTiming._y!,
      navigationServerTiming._s!,
      'after page load',
    );

    // 6. Finalize perf-kit metrics before navigation
    await storefront.finalizePerfKitMetrics();

    // 7. Navigate to a product (triggers perf-kit to send metrics)
    await storefront.navigateToFirstProduct();

    // Wait for perf-kit to send metrics after visibility change
    await storefront.page.waitForTimeout(500);

    // Verify perf-kit payload contains correct tracking values
    storefront.verifyPerfKitRequests(
      navigationServerTiming._y!,
      navigationServerTiming._s!,
      'after navigation',
    );

    // 8. Add to cart
    await storefront.addToCart();

    // 9. Verify server-timing values after cart mutation match the session values
    const serverTimingAfterCart = await storefront.getServerTimingValues(true);

    expect(
      serverTimingAfterCart._y,
      'Server-timing _y should be present after cart mutation',
    ).toBeTruthy();
    expect(
      serverTimingAfterCart._s,
      'Server-timing _s should be present after cart mutation',
    ).toBeTruthy();

    // Values should match the original navigation values (same session)
    expect(
      serverTimingAfterCart._y,
      'Server-timing _y after cart mutation should match navigation value',
    ).toBe(navigationServerTiming._y);
    expect(
      serverTimingAfterCart._s,
      'Server-timing _s after cart mutation should match navigation value',
    ).toBe(navigationServerTiming._s);

    // 10. Verify checkout URLs contain tracking params matching session
    await storefront.verifyCheckoutUrlTrackingParams(
      navigationServerTiming._y!,
      navigationServerTiming._s!,
      'in cart drawer after adding to cart',
    );

    // 11. Reload and verify state persists
    await storefront.reload();

    // Verify privacy banner still doesn't show
    await storefront.expectPrivacyBannerNotVisible();

    // Verify cookies persist after reload
    const cookiesAfterReload = await storefront.expectAnalyticsCookiesPresent();

    // Verify server-timing values after reload match original navigation values
    const serverTimingAfterReload = await storefront.getServerTimingValues();

    expect(
      serverTimingAfterReload._y,
      'Server-timing _y should be present after reload',
    ).toBeTruthy();
    expect(
      serverTimingAfterReload._s,
      'Server-timing _s should be present after reload',
    ).toBeTruthy();

    // Values should match the original navigation values (same session)
    expect(
      serverTimingAfterReload._y,
      'Server-timing _y after reload should match original navigation value',
    ).toBe(navigationServerTiming._y);
    expect(
      serverTimingAfterReload._s,
      'Server-timing _s after reload should match original navigation value',
    ).toBe(navigationServerTiming._s);

    // Cookies should also match
    expect(
      cookiesAfterReload.shopifyY?.value,
      '_shopify_y cookie after reload should match navigation value',
    ).toBe(navigationServerTiming._y);
    expect(
      cookiesAfterReload.shopifyS?.value,
      '_shopify_s cookie after reload should match navigation value',
    ).toBe(navigationServerTiming._s);

    // Wait for analytics requests after reload
    await storefront.waitForMonorailRequests();

    // Verify analytics events after reload use original tracking values
    storefront.verifyMonorailRequests(
      navigationServerTiming._y!,
      navigationServerTiming._s!,
      'after reload',
    );

    // === MIGRATION: Test upgrade from old cookies ===

    // 12. Remove HTTP-only cookies but keep old _shopify_y/_shopify_s
    await storefront.removeHttpOnlyCookies();

    // Verify HTTP-only cookies are removed
    const analyticsAfterRemoval =
      await storefront.getCookie('_shopify_analytics');
    const marketingAfterRemoval =
      await storefront.getCookie('_shopify_marketing');

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
      navigationServerTiming._y,
    );
    expect(sAfterRemoval!.value, '_shopify_s value should be unchanged').toBe(
      navigationServerTiming._s,
    );

    // Clear tracked requests before migration reload
    storefront.clearRequests();

    // 13. Reload to trigger migration
    await storefront.page.reload();
    await storefront.page.waitForLoadState('networkidle');

    // 14. Verify tracking values are preserved after migration
    const serverTimingAfterMigration = await storefront.getServerTimingValues();

    expect(
      serverTimingAfterMigration._y,
      'Server-timing _y after migration should match original value',
    ).toBe(navigationServerTiming._y);
    expect(
      serverTimingAfterMigration._s,
      'Server-timing _s after migration should match original value',
    ).toBe(navigationServerTiming._s);

    // 15. Verify HTTP-only cookies are recreated with original values
    const {
      shopifyY: yAfterMigration,
      shopifyS: sAfterMigration,
      shopifyAnalytics: analyticsAfterMigration,
      shopifyMarketing: marketingAfterMigration,
    } = await storefront.expectAnalyticsCookiesPresent();

    expect(
      analyticsAfterMigration,
      '_shopify_analytics should be recreated after migration',
    ).toBeDefined();
    expect(
      marketingAfterMigration,
      '_shopify_marketing should be recreated after migration',
    ).toBeDefined();

    // Cookie values should match original tracking values
    expect(
      yAfterMigration!.value,
      '_shopify_y should keep original value after migration',
    ).toBe(navigationServerTiming._y);
    expect(
      sAfterMigration!.value,
      '_shopify_s should keep original value after migration',
    ).toBe(navigationServerTiming._s);

    // 16. Wait for analytics and verify they use original tracking values
    await storefront.waitForMonorailRequests();

    storefront.verifyMonorailRequests(
      navigationServerTiming._y!,
      navigationServerTiming._s!,
      'after migration',
    );
  });
});
