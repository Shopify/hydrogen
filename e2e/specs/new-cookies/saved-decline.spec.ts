import {setTestStore, test, expect, DECLINE_ALL_CONSENT} from '../../fixtures';

/**
 * On an allowed-by-default store, a visitor's saved decline must override the
 * store default everywhere it could leak: full page loads, client-side
 * navigation, cart actions, checkout, and a new browser session.
 */
setTestStore('defaultConsentAllowed_cookiesEnabled');

for (const withPrivacyBanner of [false, true]) {
  test(`a saved decline overrides the allowed default (banner: ${withPrivacyBanner})`, async ({
    storefront,
  }) => {
    await storefront.setWithPrivacyBanner(withPrivacyBanner);
    await storefront.goto('/');
    await storefront.waitForConsentLoaded();
    await storefront.setTrackingConsent(DECLINE_ALL_CONSENT);

    // === Full page load ===
    await storefront.expectDeclinedConsent(
      await storefront.withConsentResponse(() => storefront.reload()),
    );
    await storefront.expectPrivacyBannerNotVisible();

    // === Client-side navigation and cart actions ===
    await storefront.navigateClientSide('/collections/all');
    await storefront.navigateToInStockProduct();
    await storefront.addToCart();
    await storefront.expectNoCheckoutUrlTrackingParams('after a saved decline');
    expect(await storefront.getConsentState()).toMatchObject({
      analyticsAllowed: false,
      uniqueToken: null,
      visitToken: null,
    });
    await storefront.expectNoAnalyticsCookies();
    // PerfKit still loads for declined visitors; it sends no tracking values.
    storefront.expectNoMonorailRequests();

    // === Checkout stays untracked ===
    const {checkoutUrl} = await storefront.getCheckoutUrlTrackingParams();
    storefront.expectCheckoutWithoutTracking(
      await storefront.collectCheckoutAnalytics(checkoutUrl, {
        expectTokens: false,
      }),
    );

    // === A new browser session keeps the decline ===
    const session = await storefront.openNewBrowserSession({
      withPrivacyBanner,
      cookiesOnly: true,
    });
    try {
      await session.expectDeclinedConsent(
        await session.withConsentResponse(() => session.goto('/')),
      );
      await session.expectPrivacyBannerNotVisible();
      await session.navigateClientSide('/collections/all');
      session.expectNoMonorailRequests();
    } finally {
      await session.context.close();
    }
  });
}
