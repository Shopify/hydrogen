import {setTestStore, test, expect} from '../../fixtures';

setTestStore('defaultConsentDisallowed_cookiesEnabled');

test.describe('Privacy Banner - Accept Flow', () => {
  test('should set analytics cookies and make analytics requests when user accepts consent', async ({
    storefront,
  }) => {
    // Enable privacy banner via JS bundle interception
    await storefront.setWithPrivacyBanner(true);

    // 1. Navigate to main page.
    // Start listening before navigation: the consent request fires during page load.
    const initialResponse = await storefront.withConsentResponse(() =>
      storefront.goto('/'),
    );

    // 2. Verify consent is declined before the shopper makes a choice
    await storefront.expectDeclinedConsent(initialResponse);

    // 3. Verify no analytics requests have been made and no analytics cookies are present
    await storefront.expectNoAnalyticsCookies();
    storefront.expectNoMonorailRequests();

    // 4. Verify perf-kit script is not downloaded yet (it mounts after consent)
    storefront.expectPerfKitNotLoaded();

    // 5. Verify privacy banner appears, click accept, and check the consent
    // response for real UUID tokens
    const tokens = await storefront.expectAllowedConsent(
      await storefront.acceptPrivacyBanner(),
    );

    // 6. The backend owns tracking cookies; Hydrogen does not create the
    // deprecated JS-visible cookies.
    await storefront.expectHttpOnlyAnalyticsCookiesPresent();
    await storefront.expectNoLegacyAnalyticsCookies();

    // 7. Wait for analytics requests to Monorail
    await storefront.waitForMonorailRequests();

    // Verify the analytics requests contain the tracking values established after consent
    storefront.verifyMonorailRequests(
      tokens.uniqueToken,
      tokens.visitToken,
      'after consent',
    );

    // TODO: Uncomment once perf-kit bot detection fix ships — perf-kit produce
    // requests are blocked by bot detection, causing verifyPerfKitRequests to fail.
    // 8. Finalize perf-kit metrics before navigation (triggers LCP finalization)
    // await storefront.finalizePerfKitMetrics();

    // 9. Navigate to a product (this triggers perf-kit to send metrics via visibility change)
    const productResponse = await storefront.navigateToInStockProduct({
      waitForConsent: true,
    });

    // Values should match the session established after consent
    expect(
      await storefront.expectAllowedConsent(productResponse),
      'Session should survive navigation',
    ).toEqual(tokens);

    // 10. Add to cart
    await storefront.addToCart();

    // 11. Verify tracking values after cart mutation match the session values
    expect(
      await storefront.getTrackingTokens(),
      'Cart mutations should preserve tokens',
    ).toEqual(tokens);

    // 12. Verify checkout URLs in cart drawer contain tracking params
    // TODO: uncomment these out once backend changes have shipped
    // await storefront.verifyCheckoutUrlTrackingParams(
    //   tokens.uniqueToken,
    //   tokens.visitToken,
    //   'in cart drawer after adding to cart',
    // );

    // 13. Reload the page and verify state is preserved
    const reloadResponse = await storefront.withConsentResponse(() =>
      storefront.reload(),
    );

    // Tracking values should match the session established after consent (before reload)
    expect(
      await storefront.expectAllowedConsent(reloadResponse),
      'Session should survive reload',
    ).toEqual(tokens);

    // Verify privacy banner does NOT show up on reload (consent was saved)
    await storefront.expectPrivacyBannerNotVisible();

    // Verify cookies are still present after reload
    await storefront.expectHttpOnlyAnalyticsCookiesPresent();
    await storefront.expectNoLegacyAnalyticsCookies();

    // Wait for analytics requests after reload
    await storefront.waitForMonorailRequests();

    // Verify analytics events after reload have correct values (matching session from before reload)
    storefront.verifyMonorailRequests(
      tokens.uniqueToken,
      tokens.visitToken,
      'after reload',
    );
  });
});
