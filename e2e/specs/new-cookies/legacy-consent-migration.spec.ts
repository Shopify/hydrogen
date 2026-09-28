import {
  setTestStore,
  test,
  expect,
  ACCEPT_ALL_CONSENT,
  DECLINE_ALL_CONSENT,
} from '../../fixtures';

/**
 * Visitors returning from an older storefront version carry only
 * JavaScript-visible cookies: the `_tracking_consent` mirror and, if tracking
 * was allowed, `_shopify_y`/`_shopify_s`. The Customer Privacy API refreshes
 * consent from them once, keeps the visitor's choice and session, and then
 * expires them, so the choice lives only in backend-managed cookies.
 */
setTestStore('defaultConsentDisallowed_cookiesEnabled');

const CHOICES = [
  {label: 'accepted', choice: ACCEPT_ALL_CONSENT, flipped: DECLINE_ALL_CONSENT},
  {label: 'declined', choice: DECLINE_ALL_CONSENT, flipped: ACCEPT_ALL_CONSENT},
] as const;

for (const withPrivacyBanner of [false, true]) {
  for (const {label, choice, flipped} of CHOICES) {
    test(`migrates a legacy ${label} visitor (banner: ${withPrivacyBanner})`, async ({
      storefront,
    }) => {
      const tracked = choice.analytics;
      await storefront.setWithPrivacyBanner(withPrivacyBanner);

      // Obtain real legacy cookie values from the store, then keep only the
      // cookies an older storefront version would have left behind.
      await storefront.goto('/');
      await storefront.waitForConsentLoaded();
      const legacy = await storefront.setTrackingConsent(choice);
      await storefront.seedLegacyVisitor(legacy);
      storefront.clearRequests();
      const consentRequests = storefront.trackConsentRequests();

      // === Migration load ===
      const response = await storefront.withConsentResponse(() =>
        storefront.reload(),
      );
      expect(consentRequests).toEqual([
        {sameOrigin: true, hasMarkerHeader: true, hasCookieHeader: true},
      ]);
      await storefront.expectPrivacyBannerNotVisible();
      if (tracked) {
        expect(
          await storefront.expectAllowedConsent(response),
          'Migration should keep the legacy session',
        ).toEqual({
          uniqueToken: legacy.uniqueToken,
          visitToken: legacy.visitToken,
        });
        await storefront.expectHttpOnlyAnalyticsCookiesPresent();
        await storefront.waitForMonorailRequests();
        storefront.verifyMonorailRequests(
          legacy.uniqueToken!,
          legacy.visitToken!,
          'after migration',
        );
      } else {
        await storefront.expectDeclinedConsent(response);
        await storefront.expectNoAnalyticsCookies();
        storefront.expectNoMonorailRequests();
      }
      await storefront.expectNoLegacyCookies();

      // === Checkout continues the migrated session (or stays untracked) ===
      await storefront.navigateToInStockProduct();
      await storefront.addToCart();
      const {checkoutUrl} = await storefront.getCheckoutUrlTrackingParams();
      const checkoutEvents = await storefront.collectCheckoutAnalytics(
        checkoutUrl,
        {expectTokens: tracked},
      );
      if (tracked) {
        storefront.expectCheckoutContinuesSession(checkoutEvents, {
          uniqueToken: legacy.uniqueToken!,
          visitToken: legacy.visitToken!,
        });
      } else {
        await storefront.expectNoCheckoutUrlTrackingParams('after migration');
        storefront.expectCheckoutWithoutTracking(checkoutEvents);
      }

      // === A later change is persisted without the legacy mirror ===
      await storefront.setTrackingConsent(flipped);
      const reloadResponse = await storefront.withConsentResponse(() =>
        storefront.reload(),
      );
      if (tracked) {
        await storefront.expectDeclinedConsent(reloadResponse);
      } else {
        await storefront.expectAllowedConsent(reloadResponse);
      }
      await storefront.expectPrivacyBannerNotVisible();
      await storefront.expectNoLegacyCookies();
    });
  }
}
