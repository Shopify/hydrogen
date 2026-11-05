import {setTestStore, test} from '../../fixtures';

setTestStore('defaultConsentDisallowed_cookiesEnabled');

test.describe('Consent Tracking - No Banner (Declined by Default)', () => {
  test('should not set analytics cookies or make analytics requests when privacy banner is disabled and consent is declined by default', async ({
    storefront,
  }) => {
    // Explicitly disable privacy banner (template default is false, but be explicit)
    await storefront.setWithPrivacyBanner(false);

    // 1. Navigate to main page.
    // Start listening before navigation: the consent request fires during page load.
    const initialResponse = await storefront.withConsentResponse(() =>
      storefront.goto('/'),
    );

    // 2. Wait for consent to be processed and verify analytics consent is
    // declined by default for this store: no tokens in the response body and
    // none through the global getters.
    await storefront.expectDeclinedConsent(initialResponse);

    // 3. Verify privacy banner does NOT appear (disabled)
    await storefront.expectPrivacyBannerNotVisible();

    // 4. Verify no analytics cookies are set (consent declined)
    await storefront.expectNoAnalyticsCookies();

    // 5. Verify no Monorail analytics requests have been made
    storefront.expectNoMonorailRequests();

    // 6. Confirm perf-kit is loaded after consent settled
    await storefront.waitForPerfKit();
    storefront.expectPerfKitLoaded();

    // 7. Verify still no Monorail analytics requests after perf-kit loads
    storefront.expectNoMonorailRequests();

    // 8. Navigate to first product and add to cart.
    // Consent should remain declined after navigation.
    const productResponse = await storefront.navigateToInStockProduct({
      waitForConsent: true,
    });
    await storefront.expectDeclinedConsent(productResponse);
    await storefront.addToCart();

    // 9. Verify still no Monorail analytics requests after cart action
    storefront.expectNoMonorailRequests();

    // 10. Verify checkout URLs contain no real tracking params (consent declined)
    await storefront.expectNoCheckoutUrlTrackingParams(
      'in cart drawer with consent declined by default',
    );

    // 11. Reload the page to verify state persists
    const reloadResponse = await storefront.withConsentResponse(() =>
      storefront.reload(),
    );
    await storefront.expectDeclinedConsent(reloadResponse);

    // Verify privacy banner still does NOT show (disabled)
    await storefront.expectPrivacyBannerNotVisible();

    // Verify analytics cookies are still not present after reload
    await storefront.expectNoAnalyticsCookies();

    // Confirm perf-kit is loaded after reload
    await storefront.waitForPerfKit();

    // 12. Verify no Monorail analytics requests after reload
    storefront.expectNoMonorailRequests();
  });
});
