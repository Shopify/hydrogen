import { setTestStore, test, expect } from "../../fixtures";

setTestStore("defaultConsentDisallowed_cookiesEnabled");

test.describe("Privacy Banner - Consent Change", () => {
  test.describe("Accept → Decline", () => {
    test("should stop analytics when user revokes consent", async ({ storefront }) => {
      // Enable privacy banner via JS bundle interception
      await storefront.setConsentMode("default-banner");

      // === SETUP: Accept consent initially ===

      // 1. Navigate to main page
      await storefront.goto("/");

      // 2. Accept privacy banner and get the established tracking values from the consent response
      // Verify they are real UUIDs (not mock values)
      const tokens = await storefront.expectAllowedConsent(await storefront.acceptPrivacyBanner());

      // 3. Only backend analytics cookies are created.
      await storefront.expectHttpOnlyAnalyticsCookiesPresent();
      await storefront.expectNoLegacyAnalyticsCookies();

      // 4. Wait for analytics to fire to confirm tracking is working
      await storefront.waitForPerfKit();
      await storefront.waitForMonorailRequests();

      // Verify analytics requests have correct tracking values
      storefront.verifyMonorailRequests(
        tokens.uniqueToken,
        tokens.visitToken,
        "after initial accept",
      );

      // Clear tracked requests before consent change
      storefront.clearRequests();

      // === CONSENT CHANGE: Decline via preferences ===

      // Model cookies left by an older storefront so revocation also covers their cleanup.
      const storefrontOrigin = new URL(storefront.page.url()).origin;
      await storefront.context.addCookies([
        { name: "_shopify_y", value: tokens.uniqueToken, url: storefrontOrigin },
        { name: "_shopify_s", value: tokens.visitToken, url: storefrontOrigin },
      ]);

      // 5. Open privacy preferences, decline consent, and verify analytics consent is revoked
      await storefront.openPrivacyPreferences();
      await storefront.expectDeclinedConsent(await storefront.declineInPreferences());

      // 6. Verify _shopify_essential cookie is set after declining
      await storefront.expectEssentialCookiePresent();

      // 7. Verify analytics/marketing cookies are no longer valid (cleared or invalidated)
      await storefront.expectNoAnalyticsCookies();

      // 8. Verify no NEW analytics requests are made after revoking consent
      storefront.expectNoMonorailRequests();

      // 9. Navigate to a product page to verify consent remains declined
      const productResponse = await storefront.navigateToInStockProduct({ waitForConsent: true });
      await storefront.expectDeclinedConsent(productResponse);

      // 10. Add to cart and verify no analytics requests or checkout URL tracking params
      await storefront.addToCart();
      storefront.expectNoMonorailRequests();

      // TODO: Re-enable once Hydrogen dev-preview can strip or replace checkoutUrl tracking params from SFAPI.
      // await storefront.expectNoCheckoutUrlTrackingParams("after revoking consent");

      // 11. Reload the page to verify persistence
      const reloadResponse = await storefront.withConsentResponse(() => storefront.reload());
      await storefront.expectDeclinedConsent(reloadResponse);

      // Verify privacy banner does NOT show (consent choice was saved)
      await storefront.expectPrivacyBannerNotVisible();

      // Verify analytics cookies are still not present after reload
      await storefront.expectNoAnalyticsCookies();

      // Verify essential cookie persists
      await storefront.expectEssentialCookiePresent();

      // Wait for perf-kit and verify no analytics requests after reload
      await storefront.waitForPerfKit();
      storefront.expectNoMonorailRequests();
    });
  });

  test.describe("Decline → Accept", () => {
    test("should start analytics when user grants consent", async ({ storefront }) => {
      // Enable privacy banner via JS bundle interception
      await storefront.setConsentMode("default-banner");

      // === SETUP: Decline consent initially ===

      // 1. Navigate to main page
      await storefront.goto("/");

      // 2. Decline privacy banner and verify analytics consent is denied
      await storefront.expectDeclinedConsent(await storefront.declinePrivacyBanner());

      // 3. Verify _shopify_essential cookie is set after declining
      await storefront.expectEssentialCookiePresent();

      // 4. Verify no analytics cookies are present
      await storefront.expectNoAnalyticsCookies();

      // 5. Wait for perf-kit to load but verify no analytics requests
      await storefront.waitForPerfKit();
      storefront.expectNoMonorailRequests();

      // Clear tracked requests before consent change
      storefront.clearRequests();

      // === CONSENT CHANGE: Accept via preferences ===

      // 6. Open privacy preferences and accept consent
      await storefront.openPrivacyPreferences();

      // Accepting consent should return real UUIDs in the consent response
      const tokens = await storefront.expectAllowedConsent(await storefront.acceptInPreferences());

      // 7. Only backend analytics cookies are created after granting consent.
      await storefront.expectHttpOnlyAnalyticsCookiesPresent();
      await storefront.expectNoLegacyAnalyticsCookies();

      // 8. Navigate to a product page and wait for analytics requests to fire after granting consent
      const productResponse = await storefront.navigateToInStockProduct({ waitForConsent: true });

      // Tracking values should match the session established after granting consent
      expect(
        await storefront.expectAllowedConsent(productResponse),
        "Session should survive navigation",
      ).toEqual(tokens);
      await storefront.waitForMonorailRequests();

      // Verify analytics requests contain the correct tracking values
      storefront.verifyMonorailRequests(
        tokens.uniqueToken,
        tokens.visitToken,
        "after granting consent via preferences",
      );

      // 9. Verify perf-kit uses the tracking values established after granting consent
      // Note: We skip perf-kit request verification here because it can initialize before
      // consent and retain initial tracking values after changing consent mid-session.
      // This is a bug in perf-kit that needs to be fixed separately.
      // The Monorail requests above already verify tracking is working correctly.

      // 10. Add to cart and verify tracking values and checkout URLs match the new session
      await storefront.addToCart();
      expect(await storefront.getTrackingTokens(), "Cart mutations should preserve tokens").toEqual(
        tokens,
      );
      // TODO: uncomment these out once backend changes have shipped
      // await storefront.verifyCheckoutUrlTrackingParams(
      //   tokens.uniqueToken,
      //   tokens.visitToken,
      //   "after granting consent",
      // );

      // 11. Reload the page to verify persistence
      const reloadResponse = await storefront.withConsentResponse(() => storefront.reload());

      // Verify tracking values match the session established after granting consent
      expect(
        await storefront.expectAllowedConsent(reloadResponse),
        "Session should survive reload",
      ).toEqual(tokens);

      // Verify privacy banner does NOT show (consent choice was saved)
      await storefront.expectPrivacyBannerNotVisible();

      // Verify cookies persist after reload
      await storefront.expectHttpOnlyAnalyticsCookiesPresent();
      await storefront.expectNoLegacyAnalyticsCookies();

      // Wait for analytics requests after reload
      await storefront.waitForMonorailRequests();

      // Verify analytics events after reload have correct values
      storefront.verifyMonorailRequests(
        tokens.uniqueToken,
        tokens.visitToken,
        "after reload with consent granted",
      );
    });
  });
});
