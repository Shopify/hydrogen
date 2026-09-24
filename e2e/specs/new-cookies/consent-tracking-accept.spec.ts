import {setTestStore, test, expect} from '../../fixtures';

setTestStore('defaultConsentAllowed_cookiesEnabled');

test.describe('Consent Tracking - Auto-Allowed (Consent Allowed by Default)', () => {
  test('should set analytics cookies and fire analytics requests immediately when consent is allowed by default', async ({
    storefront,
  }: Parameters<Parameters<typeof test>[2]>[0]) => {
    // Enable privacy banner setting (but banner shouldn't show since consent is auto-allowed)
    await storefront.setWithPrivacyBanner(true);

    // 1. Navigate to main page.
    // Start listening before navigation: the consent request fires during page load.
    const initialResponse = await storefront.withConsentResponse(() =>
      storefront.goto('/'),
    );

    // 2. Verify privacy banner does NOT appear (consent is already allowed by default)
    await storefront.expectPrivacyBannerNotVisible();

    // 3. Check tracking values from the consent response - these should be real UUIDs
    const tokens = await storefront.expectAllowedConsent(initialResponse);

    // 4. Auto-allowed consent establishes the modern http-only cookies.
    // Hydrogen no longer creates the deprecated JS-visible cookies.
    await storefront.expectHttpOnlyAnalyticsCookiesPresent();
    await storefront.expectNoLegacyAnalyticsCookies();

    // 5. Confirm perf-kit is loaded and wait for analytics requests to fire
    await storefront.waitForPerfKit();
    storefront.expectPerfKitLoaded();

    // Wait for Monorail analytics requests
    await storefront.waitForMonorailRequests();

    // Verify the analytics requests contain the tracking values from the consent response
    storefront.verifyMonorailRequests(
      tokens.uniqueToken,
      tokens.visitToken,
      'after page load',
    );

    // TODO: Uncomment once perf-kit bot detection fix ships — perf-kit produce
    // requests are blocked by bot detection, causing verifyPerfKitRequests to fail.
    // 6. Finalize perf-kit metrics before navigation
    // await storefront.finalizePerfKitMetrics();

    // 7. Navigate to a product (triggers perf-kit to send metrics)
    const productResponse = await storefront.navigateToInStockProduct({
      waitForConsent: true,
    });

    // Tracking values should match the original consent response (same session)
    expect(
      await storefront.expectAllowedConsent(productResponse),
      'Session should survive navigation',
    ).toEqual(tokens);

    // 8. Add to cart
    await storefront.addToCart();

    // 9. Verify tracking values after cart mutation match the session values
    expect(
      await storefront.getTrackingTokens(),
      'Cart mutations should preserve tokens',
    ).toEqual(tokens);

    // 10. Verify checkout URLs contain tracking params matching session
    // TODO: uncomment these out once backend changes have shipped
    // await storefront.verifyCheckoutUrlTrackingParams(
    //   tokens.uniqueToken,
    //   tokens.visitToken,
    //   'in cart drawer after adding to cart',
    // );

    // 11. Reload and verify state persists
    const reloadResponse = await storefront.withConsentResponse(() =>
      storefront.reload(),
    );

    // Tracking values should match the original consent response (same session)
    expect(
      await storefront.expectAllowedConsent(reloadResponse),
      'Session should survive reload',
    ).toEqual(tokens);

    // Verify privacy banner still doesn't show
    await storefront.expectPrivacyBannerNotVisible();

    // Verify cookies persist after reload
    await storefront.expectHttpOnlyAnalyticsCookiesPresent();
    await storefront.expectNoLegacyAnalyticsCookies();

    // Wait for analytics requests after reload
    await storefront.waitForMonorailRequests();

    // Verify analytics events after reload use original tracking values
    storefront.verifyMonorailRequests(
      tokens.uniqueToken,
      tokens.visitToken,
      'after reload',
    );

    // === MIGRATION: Test upgrade from deprecated cookies ===

    // Model cookies left by an older storefront version, which used Path=/.
    const storefrontOrigin = new URL(storefront.page.url()).origin;
    await storefront.context.addCookies([
      {name: '_shopify_y', value: tokens.uniqueToken!, url: storefrontOrigin},
      {name: '_shopify_s', value: tokens.visitToken!, url: storefrontOrigin},
    ]);

    // 12. Remove HTTP-only cookies but keep the deprecated _shopify_y/_shopify_s
    await storefront.removeHttpOnlyCookies();

    // Verify HTTP-only cookies are removed
    expect(await storefront.getCookie('_shopify_analytics')).toBeUndefined();
    expect(await storefront.getCookie('_shopify_marketing')).toBeUndefined();

    // Verify the deprecated tracking cookies are still present with their values
    expect((await storefront.getCookie('_shopify_y'))?.value).toBe(
      tokens.uniqueToken,
    );
    expect((await storefront.getCookie('_shopify_s'))?.value).toBe(
      tokens.visitToken,
    );

    // Clear tracked requests before migration reload
    storefront.clearRequests();

    // 13. Reload to trigger migration
    const migrationResponse = await storefront.withConsentResponse(() =>
      storefront.page.reload(),
    );
    await storefront.page.waitForLoadState('networkidle');

    // 14. Verify tracking values are preserved after migration: the deprecated
    // cookie values are forwarded upstream on the consent request, so the same
    // session continues.
    expect(
      await storefront.expectAllowedConsent(migrationResponse),
      'Migration should preserve the original tokens',
    ).toEqual(tokens);

    // 15. Verify migration re-establishes the modern HTTP-only cookies and
    // expires the deprecated ones.
    await storefront.expectHttpOnlyAnalyticsCookiesPresent();
    await storefront.expectNoLegacyAnalyticsCookies();

    // 16. Wait for analytics and verify they use original tracking values
    await storefront.waitForMonorailRequests();
    storefront.verifyMonorailRequests(
      tokens.uniqueToken,
      tokens.visitToken,
      'after migration',
    );
  });
});
