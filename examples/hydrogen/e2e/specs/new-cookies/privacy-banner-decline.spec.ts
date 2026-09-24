import { setTestStore, test } from "../../fixtures";

setTestStore("defaultConsentDisallowed_cookiesEnabled");

test.describe("Privacy Banner - Decline Flow", () => {
  test("should not set analytics cookies or make analytics requests when user declines consent", async ({
    storefront,
  }) => {
    // Enable privacy banner via JS bundle interception
    await storefront.setConsentMode("default-banner");

    // 1. Navigate to main page
    // Start listening before navigation: the initial consent response fires during page load.
    const initialResponse = await storefront.withConsentResponse(() => storefront.goto("/"));
    await storefront.expectDeclinedConsent(initialResponse);

    // 2. Verify no analytics cookies are set yet and no analytics requests have been made
    await storefront.expectNoAnalyticsCookies();
    storefront.expectNoMonorailRequests();

    // 3. Verify perf-kit is loaded eagerly but does not beacon before consent
    await storefront.waitForPerfKit();
    storefront.expectPerfKitLoaded();
    storefront.expectNoPerfKitProduceRequests();

    // 4. Verify privacy banner appears, click decline, and confirm analytics consent is denied
    await storefront.expectDeclinedConsent(await storefront.declinePrivacyBanner());

    // 5. Verify _shopify_essential cookie is set after declining
    await storefront.expectEssentialCookiePresent();

    // 6. Verify analytics/marketing cookies are NOT set after declining
    await storefront.expectNoAnalyticsCookies();

    // 7. Verify perf-kit still does not beacon after declining
    storefront.expectNoPerfKitProduceRequests();

    // 8. Verify no analytics requests are made
    storefront.expectNoMonorailRequests();

    // 9. Navigate to first product and add to cart to verify consent remains declined
    const productResponse = await storefront.navigateToInStockProduct({ waitForConsent: true });
    await storefront.expectDeclinedConsent(productResponse);

    // Add item to cart
    await storefront.addToCart();

    // Verify still no analytics requests after cart action
    storefront.expectNoMonorailRequests();

    // 10. Verify checkout URLs contain no tracking params (consent declined)
    // TODO: Re-enable once Hydrogen dev-preview can strip or replace checkoutUrl tracking params from SFAPI.
    // await storefront.expectNoCheckoutUrlTrackingParams("in cart drawer after declining consent");

    // 11. Reload the page to verify persistence
    const reloadResponse = await storefront.withConsentResponse(() => storefront.reload());
    await storefront.expectDeclinedConsent(reloadResponse);

    // Verify privacy banner does NOT show up on reload (consent was saved)
    await storefront.expectPrivacyBannerNotVisible();

    // Verify _shopify_essential cookie persists after reload
    await storefront.expectEssentialCookiePresent();

    // Verify analytics cookies are still not present after reload
    await storefront.expectNoAnalyticsCookies();

    // Confirm perf-kit is loaded after reload
    await storefront.waitForPerfKit();

    // Verify no analytics requests after reload
    storefront.expectNoMonorailRequests();
  });
});
