import {setTestStore, test, expect} from '../../fixtures';
import {MOCK_VALUE_PATTERN} from '../../fixtures/storefront';

setTestStore('defaultConsentDisallowed_cookiesEnabled');

test.describe('Consent Tracking - No Banner (Declined by Default)', () => {
  test('should not set analytics cookies or make analytics requests when privacy banner is disabled and consent is declined by default', async ({
    storefront,
  }) => {
    // Explicitly disable privacy banner (template default is false, but be explicit)
    await storefront.setWithPrivacyBanner(false);

    // Set up wait for consent response BEFORE navigating (it fires during page load)
    const consentResponsePromise = storefront.waitForConsentResponse();

    // 1. Navigate to main page
    await storefront.goto('/');

    // 2. Wait for consent response to be processed
    await consentResponsePromise;

    // 3. Verify privacy banner does NOT appear (disabled)
    await storefront.expectPrivacyBannerNotVisible();

    // 4. Verify server-timing values are now mock values
    const serverTimingValues = await storefront.getServerTimingValues(true);
    storefront.expectMockServerTimingValues(serverTimingValues);

    // 5. Verify analyticsProcessingAllowed returns false (consent declined by default)
    const analyticsAllowed = await storefront.page.evaluate(() => {
      try {
        return window.Shopify?.customerPrivacy?.analyticsProcessingAllowed?.();
      } catch {
        return undefined;
      }
    });

    expect(
      analyticsAllowed,
      'analyticsProcessingAllowed() should return false when consent is declined by default',
    ).toBe(false);

    // 6. Verify no analytics cookies are set (consent declined)
    await storefront.expectNoAnalyticsCookies();

    // 7. Verify no Monorail analytics requests have been made
    storefront.expectNoMonorailRequests();

    // 8. Wait for perf-kit to be downloaded (it loads regardless of consent)
    await storefront.waitForPerfKit();
    storefront.expectPerfKitLoaded();

    // 9. Verify still no Monorail analytics requests after perf-kit loads
    storefront.expectNoMonorailRequests();

    // 10. Navigate to first product and add to cart
    await storefront.navigateToFirstProduct();
    await storefront.addToCart();

    // 11. Check server-timing from cart mutation - should be mock values
    const serverTimingAfterCart = await storefront.getServerTimingValues(true);
    storefront.expectMockServerTimingValues(serverTimingAfterCart);

    // 12. Verify still no Monorail analytics requests after cart action
    storefront.expectNoMonorailRequests();

    // 13. Verify checkout URLs contain MOCK tracking params (consent declined)
    await storefront.expectMockCheckoutUrlTrackingParams(
      'in cart drawer with consent declined by default',
    );

    // 14. Reload the page to verify state persists
    await storefront.reload();

    // Verify privacy banner still does NOT show (disabled)
    await storefront.expectPrivacyBannerNotVisible();

    // Verify analytics cookies are still not present after reload
    await storefront.expectNoAnalyticsCookies();

    // Wait for perf-kit to be downloaded after reload
    await storefront.waitForPerfKit();

    // 15. Verify no Monorail analytics requests after reload
    storefront.expectNoMonorailRequests();
  });
});
