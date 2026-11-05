import {setTestStore, test, expect} from '../../fixtures';

/**
 * Checkout runs on the shop's checkout domain, so the storefront session
 * reaches it only through the checkout URL. Checkout's own analytics events
 * report which session and consent it continued with.
 */
setTestStore('defaultConsentDisallowed_cookiesEnabled');

test.describe('Checkout handoff after a privacy banner choice', () => {
  test.beforeEach(async ({storefront}) => {
    await storefront.setWithPrivacyBanner(true);
    await storefront.goto('/');
  });

  test('continues the accepted session in checkout', async ({storefront}) => {
    const tokens = await storefront.expectAllowedConsent(
      await storefront.acceptPrivacyBanner(),
    );
    await storefront.navigateToInStockProduct();
    await storefront.addToCart();

    const params = await storefront.getCheckoutUrlTrackingParams();
    expect(params).toMatchObject(tokens);
    storefront.expectCheckoutContinuesSession(
      await storefront.collectCheckoutAnalytics(params.checkoutUrl, {
        expectTokens: true,
      }),
      {uniqueToken: tokens.uniqueToken!, visitToken: tokens.visitToken!},
    );
  });

  test('keeps checkout untracked after a decline', async ({storefront}) => {
    await storefront.expectDeclinedConsent(
      await storefront.declinePrivacyBanner(),
    );
    await storefront.navigateToInStockProduct();
    await storefront.addToCart();

    await storefront.expectNoCheckoutUrlTrackingParams('after declining');
    const {checkoutUrl} = await storefront.getCheckoutUrlTrackingParams();
    storefront.expectCheckoutWithoutTracking(
      await storefront.collectCheckoutAnalytics(checkoutUrl, {
        expectTokens: false,
      }),
    );
  });

  test('continues the session granted after an earlier decline', async ({
    storefront,
  }) => {
    await storefront.expectDeclinedConsent(
      await storefront.declinePrivacyBanner(),
    );
    await storefront.navigateToInStockProduct();
    await storefront.addToCart();
    await storefront.expectNoCheckoutUrlTrackingParams('before granting');
    await storefront.closeCartAside();

    // The consent change revalidates the cart, whose checkout URL gains the
    // new session parameters without a reload.
    await storefront.openPrivacyPreferences();
    const tokens = await storefront.expectAllowedConsent(
      await storefront.acceptInPreferences(),
    );
    await storefront.openCartAside();
    await expect
      .poll(() => storefront.getCheckoutUrlTrackingParams())
      .toMatchObject(tokens);

    const {checkoutUrl} = await storefront.getCheckoutUrlTrackingParams();
    storefront.expectCheckoutContinuesSession(
      await storefront.collectCheckoutAnalytics(checkoutUrl, {
        expectTokens: true,
      }),
      {uniqueToken: tokens.uniqueToken!, visitToken: tokens.visitToken!},
    );
  });
});
