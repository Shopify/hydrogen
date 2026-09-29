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
const CHOICES = [
  {label: 'accepted', choice: ACCEPT_ALL_CONSENT, flipped: DECLINE_ALL_CONSENT},
  {label: 'declined', choice: DECLINE_ALL_CONSENT, flipped: ACCEPT_ALL_CONSENT},
] as const;
const SCENARIOS = [false, true].flatMap((withPrivacyBanner) =>
  CHOICES.map((choice) => ({...choice, withPrivacyBanner})),
);

// Both store defaults: on an allowed-by-default store a lost legacy decline
// would silently start tracking, and on a declined-by-default store a lost
// legacy acceptance would silently stop it or bring the banner back.
for (const storeKey of [
  'defaultConsentAllowed_cookiesEnabled',
  'defaultConsentDisallowed_cookiesEnabled',
] as const) {
  test.describe(storeKey, () => {
    setTestStore(storeKey);
    for (const scenario of SCENARIOS) defineMigrationTest(scenario);
  });
}

function defineMigrationTest({
  label,
  choice,
  flipped,
  withPrivacyBanner,
}: (typeof SCENARIOS)[number]) {
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

    // === The original choice holds on its own after the deletion ===
    const afterDeletionResponse = await storefront.withConsentResponse(() =>
      storefront.reload(),
    );
    if (tracked) {
      expect(
        await storefront.expectAllowedConsent(afterDeletionResponse),
        'The migrated session survives without the legacy cookies',
      ).toEqual({
        uniqueToken: legacy.uniqueToken,
        visitToken: legacy.visitToken,
      });
    } else {
      await storefront.expectDeclinedConsent(afterDeletionResponse);
      await storefront.navigateClientSide('/collections/all');
      storefront.expectNoMonorailRequests();
    }
    await storefront.expectPrivacyBannerNotVisible();
    await storefront.expectNoLegacyCookies();

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
