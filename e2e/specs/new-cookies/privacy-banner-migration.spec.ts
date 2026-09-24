import {setTestStore, test, expect} from '../../fixtures';

setTestStore('defaultConsentDisallowed_cookiesEnabled');

test.describe('Privacy Banner - Session Migration', () => {
  test.describe('Consent Allowed (with existing deprecated tracking cookies)', () => {
    test('should preserve tracking values from deprecated cookies after migration', async ({
      storefront,
    }) => {
      // Enable privacy banner via JS bundle interception
      await storefront.setWithPrivacyBanner(true);

      // === SETUP: Establish consent and get initial tracking values ===

      // 1. Navigate to main page
      await storefront.goto('/');

      // 2. Accept privacy banner and get the established tracking values from
      // the consent response. Verify they are real UUIDs (not mock values).
      const tokens = await storefront.expectAllowedConsent(
        await storefront.acceptPrivacyBanner(),
      );

      // 3. New visitors receive the modern http-only cookies only.
      await storefront.expectHttpOnlyAnalyticsCookiesPresent();
      await storefront.expectNoLegacyAnalyticsCookies();

      // === MIGRATION: Remove new cookies but keep the deprecated ones ===

      // Model cookies left by an older storefront version.
      await storefront.context.addCookies([
        {
          name: '_shopify_y',
          value: tokens.uniqueToken!,
          url: storefront.page.url(),
        },
        {
          name: '_shopify_s',
          value: tokens.visitToken!,
          url: storefront.page.url(),
        },
      ]);

      // 4. Remove ONLY the analytics HTTP-only cookies (simulate migration scenario)
      // Keep: _shopify_y, _shopify_s (deprecated tracking cookies)
      // Keep: _shopify_essential(s), which persist the saved consent choice.
      // Remove: _shopify_analytics, _shopify_marketing
      await storefront.removeCookies([
        '_shopify_analytics',
        '_shopify_marketing',
      ]);

      // Verify HTTP-only cookies are removed
      expect(await storefront.getCookie('_shopify_analytics')).toBeUndefined();
      expect(await storefront.getCookie('_shopify_marketing')).toBeUndefined();

      // Verify the deprecated tracking cookies are still present with their values
      expect((await storefront.getCookie('_shopify_y'))?.value).toBe(
        tokens.uniqueToken,
      );
      expect((await storefront.getCookie('_shopify_s'))?.value).toBe(
        tokens.visitToken,
      );

      // Clear tracked requests before reload
      storefront.clearRequests();

      // 5. Reload the page - this initiates the migration test
      const response = await storefront.withConsentResponse(() =>
        storefront.reload(),
      );

      // === VERIFY: Tracking values should be preserved after migration ===

      // 6. Verify tracking values from the consent response match the original
      // established values: the deprecated cookie values are forwarded upstream
      // on the consent request, so the same session continues.
      expect(
        await storefront.expectAllowedConsent(response),
        'Migration should preserve the original tokens',
      ).toEqual(tokens);

      // 7. Privacy banner should NOT show (consent was previously saved)
      await storefront.expectPrivacyBannerNotVisible();

      // 8. Verify migration re-establishes the modern HTTP-only cookies and
      // expires the deprecated ones.
      await storefront.expectHttpOnlyAnalyticsCookiesPresent();
      await storefront.expectNoLegacyAnalyticsCookies();

      // 9. Wait for analytics requests and verify they use original tracking values
      await storefront.waitForPerfKit();
      await storefront.waitForMonorailRequests();
      storefront.verifyMonorailRequests(
        tokens.uniqueToken,
        tokens.visitToken,
        'after migration',
      );
    });
  });

  test.describe('Consent Declined (no existing tracking cookies)', () => {
    test('should not send analytics or set tracking params when consent was declined', async ({
      storefront,
    }) => {
      // Enable privacy banner via JS bundle interception
      await storefront.setWithPrivacyBanner(true);

      // === SETUP: Decline consent ===

      // 1. Navigate to main page
      await storefront.goto('/');

      // 2. Decline privacy banner and verify analytics consent is denied
      await storefront.expectDeclinedConsent(
        await storefront.declinePrivacyBanner(),
      );

      // 3. Verify _shopify_essential cookie is set after declining
      await storefront.expectEssentialCookiePresent();

      // 4. Verify analytics cookies are NOT set
      await storefront.expectNoAnalyticsCookies();

      // === MIGRATION: Remove new cookies AND deprecated tracking cookies ===

      // 5. Remove analytics cookies AND _shopify_y and _shopify_s.
      // Keep _shopify_essential(s), which persist the declined consent choice.
      // This simulates a migration where user had declined consent and
      // we're testing the system handles missing tracking cookies correctly
      await storefront.removeCookies([
        '_shopify_analytics',
        '_shopify_marketing',
        '_shopify_y',
        '_shopify_s',
      ]);

      // Verify all tracking-related cookies are removed
      await storefront.expectNoAnalyticsCookies();

      // Clear tracked requests before reload
      storefront.clearRequests();

      // 6. Reload the page - this initiates the migration test
      const response = await storefront.withConsentResponse(() =>
        storefront.reload(),
      );

      // === VERIFY: No tracking should occur ===

      // 7. Verify analytics consent remains declined
      await storefront.expectDeclinedConsent(response);

      // 8. Privacy banner should NOT show (consent choice was previously saved)
      await storefront.expectPrivacyBannerNotVisible();

      // 9. Verify analytics cookies are still NOT present
      await storefront.expectNoAnalyticsCookies();

      // 10. Wait for perf-kit to load (it should still load for performance metrics)
      await storefront.waitForPerfKit();

      // 11. Verify NO Monorail analytics requests are made
      storefront.expectNoMonorailRequests();
    });
  });
});
