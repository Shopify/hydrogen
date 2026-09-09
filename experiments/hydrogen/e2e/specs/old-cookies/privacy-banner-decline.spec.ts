import { setTestStore, test } from "../../fixtures";

setTestStore("defaultConsentDisallowed_cookiesDisabled");

test.describe("Privacy Banner - Decline Flow", () => {
  test("should not set analytics cookies or make analytics requests when user declines consent", async ({
    storefront,
  }) => {
    // Enable privacy banner via JS bundle interception (preserves server-timing)
    await storefront.setConsentMode("default-banner");

    // 1. Navigate to main page
    await storefront.goto("/");

    // 2. Verify no analytics cookies are set yet and no analytics requests have been made
    await storefront.expectNoAnalyticsCookies();
    storefront.expectNoMonorailRequests();

    // 3. Verify perf-kit is loaded eagerly but does not beacon before consent
    await storefront.waitForPerfKit();
    storefront.expectPerfKitLoaded();
    storefront.expectNoPerfKitProduceRequests();

    // 4. Verify privacy banner appears and click decline
    await storefront.declinePrivacyBanner();

    // 5. Verify _shopify_essential cookie is set after declining
    await storefront.expectEssentialCookiePresent();

    // 6. Verify analytics/marketing cookies are NOT set after declining
    await storefront.expectNoAnalyticsCookies();

    // 7. Verify server-timing values after decline are either absent or contain mock values
    const updatedServerTimingValues = await storefront.getServerTimingValues(true);
    storefront.expectMockServerTimingValues(updatedServerTimingValues);

    // 8. Verify perf-kit still does not beacon after declining
    storefront.expectNoPerfKitProduceRequests();

    // 9. Wait and verify no analytics requests are made
    await storefront.page.waitForTimeout(1500);
    storefront.expectNoMonorailRequests();

    // 10. Navigate to first product and add to cart to verify server-timing mock values
    await storefront.navigateToInStockProduct();

    // Add item to cart
    await storefront.addToCart();

    // Check server-timing from the latest resource (cart mutation response)
    const serverTimingAfterCart = await storefront.getServerTimingValues(true);

    // Server-timing _y and _s should be mock values after cart action (consent was declined)
    storefront.expectMockServerTimingValues(serverTimingAfterCart);

    // Verify still no analytics requests after cart action
    storefront.expectNoMonorailRequests();

    // 11. Verify checkout URLs contain MOCK tracking params (consent declined)
    // TODO: Re-enable once Hydrogen dev-preview can strip or replace checkoutUrl tracking params from SFAPI.
    // await storefront.expectNoCheckoutUrlTrackingParams("in cart drawer after declining consent");

    // 12. Reload the page to verify persistence
    await storefront.reload();

    // Verify privacy banner does NOT show up on reload (consent was saved)
    await storefront.expectPrivacyBannerNotVisible();

    // Verify _shopify_essential cookie persists after reload
    await storefront.expectEssentialCookiePresent();

    // Verify analytics cookies are still not present after reload
    await storefront.expectNoAnalyticsCookies();

    // Confirm perf-kit is loaded after reload
    await storefront.waitForPerfKit();

    // Wait and verify no analytics requests after reload
    await storefront.page.waitForTimeout(1500);
    storefront.expectNoMonorailRequests();
  });
});
