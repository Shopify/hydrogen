import {setTestStore, test, expect} from '../../fixtures';

setTestStore('defaultConsentDisallowed_cookiesDisabled');

test.describe('Privacy Banner - Accept Flow', () => {
  test('should set analytics cookies and make analytics requests when user accepts consent', async ({
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

    // 3. Verify no analytics requests have been made and no analytics cookies are present
    await storefront.expectNoAnalyticsCookies();
    storefront.expectNoMonorailRequests();

    // 4. Verify perf-kit script is not downloaded yet
    storefront.expectPerfKitNotLoaded();

    // 5. Verify privacy banner appears and click accept
    await storefront.acceptPrivacyBanner();

    // 6. Verify server-timing values changed after consent
    // Get updated server timing values from the page (prefer latest resource entries)
    const updatedServerTimingValues = await storefront.getServerTimingValues(
      true,
    );

    // Verify server-timing values after consent are different from initial values
    // The consent response should bring back different _y and _s values
    expect(
      updatedServerTimingValues._y,
      'Updated _y value should be present after consent',
    ).toBeTruthy();
    expect(
      updatedServerTimingValues._s,
      'Updated _s value should be present after consent',
    ).toBeTruthy();

    // Verify values changed from initial (new tracking session after consent)
    expect(
      updatedServerTimingValues._y,
      'Server-timing _y should be different after consent',
    ).not.toBe(initialServerTimingValues._y);
    expect(
      updatedServerTimingValues._s,
      'Server-timing _s should be different after consent',
    ).not.toBe(initialServerTimingValues._s);

    // 7. Verify _shopify_y and _shopify_s cookies are created with server-timing values
    // Note: Old cookie system doesn't have HTTP-only _shopify_analytics/_shopify_marketing cookies
    const {shopifyY, shopifyS} =
      await storefront.expectAnalyticsCookiesPresent();

    // The cookie values should match the LATEST server-timing values (from consent response)
    expect(
      shopifyY!.value,
      '_shopify_y cookie value should match latest server-timing _y value',
    ).toBe(updatedServerTimingValues._y);

    expect(
      shopifyS!.value,
      '_shopify_s cookie value should match latest server-timing _s value',
    ).toBe(updatedServerTimingValues._s);

    // 8. Wait for perf-kit to download and analytics requests to fire
    await storefront.waitForPerfKit();
    storefront.expectPerfKitLoaded();

    // Wait for analytics requests to Monorail
    await storefront.waitForMonorailRequests();

    // Verify the analytics requests contain the correct _y and _s values
    storefront.verifyMonorailRequests(
      updatedServerTimingValues._y!,
      updatedServerTimingValues._s!,
      'after consent',
    );

    // 9. Finalize perf-kit metrics before navigation (triggers LCP finalization)
    await storefront.finalizePerfKitMetrics();

    // 10. Navigate to a product (this triggers perf-kit to send metrics via visibility change)
    await storefront.navigateToFirstProduct();

    // 11. Verify perf-kit payload contains correct tracking values
    // Wait a moment for perf-kit to send its metrics after visibility change
    await storefront.page.waitForTimeout(500);

    storefront.verifyPerfKitRequests(
      updatedServerTimingValues._y!,
      updatedServerTimingValues._s!,
      'after navigation',
    );

    // 12. Add to cart
    await storefront.addToCart();

    // 13. Verify server-timing values after cart mutation match the session values
    const serverTimingAfterCart = await storefront.getServerTimingValues(true);

    expect(
      serverTimingAfterCart._y,
      'Server-timing _y should be present after cart mutation',
    ).toBeTruthy();
    expect(
      serverTimingAfterCart._s,
      'Server-timing _s should be present after cart mutation',
    ).toBeTruthy();

    // Values should match the session established after consent
    expect(
      serverTimingAfterCart._y,
      'Server-timing _y after cart mutation should match session value',
    ).toBe(updatedServerTimingValues._y);
    expect(
      serverTimingAfterCart._s,
      'Server-timing _s after cart mutation should match session value',
    ).toBe(updatedServerTimingValues._s);

    // 14. Verify checkout URLs in cart drawer contain tracking params
    await storefront.verifyCheckoutUrlTrackingParams(
      updatedServerTimingValues._y!,
      updatedServerTimingValues._s!,
      'in cart drawer after adding to cart',
    );

    // 15. Reload the page and verify state is preserved
    await storefront.reload();

    // Verify privacy banner does NOT show up on reload (consent was saved)
    await storefront.expectPrivacyBannerNotVisible();

    // Verify cookies are still present after reload
    const cookiesAfterReload = await storefront.expectAnalyticsCookiesPresent();

    // Verify server-timing values after reload match the values from before reload (same session)
    const serverTimingAfterReload = await storefront.getServerTimingValues();

    expect(
      serverTimingAfterReload._y,
      'Server-timing _y should be present after reload',
    ).toBeTruthy();
    expect(
      serverTimingAfterReload._s,
      'Server-timing _s should be present after reload',
    ).toBeTruthy();

    // Values should match the session established after consent (before reload)
    expect(
      serverTimingAfterReload._y,
      'Server-timing _y after reload should match value from before reload',
    ).toBe(updatedServerTimingValues._y);
    expect(
      serverTimingAfterReload._s,
      'Server-timing _s after reload should match value from before reload',
    ).toBe(updatedServerTimingValues._s);

    // Cookies should also match the server-timing values
    expect(
      cookiesAfterReload.shopifyY?.value,
      '_shopify_y cookie after reload should match server-timing _y',
    ).toBe(updatedServerTimingValues._y);
    expect(
      cookiesAfterReload.shopifyS?.value,
      '_shopify_s cookie after reload should match server-timing _s',
    ).toBe(updatedServerTimingValues._s);

    // Wait for analytics requests after reload
    await storefront.waitForMonorailRequests();

    // Verify analytics events after reload have correct values (matching session from before reload)
    storefront.verifyMonorailRequests(
      updatedServerTimingValues._y!,
      updatedServerTimingValues._s!,
      'after reload',
    );
  });
});
