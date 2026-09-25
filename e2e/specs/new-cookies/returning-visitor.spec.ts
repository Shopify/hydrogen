import {setTestStore, test, expect} from '../../fixtures';

/**
 * Returning-visitor edge cases for the deprecated-cookie removal: visitors
 * arriving with `_shopify_y`/`_shopify_s` cookies left by an older storefront
 * version, and visitors returning after those cookies were already removed.
 */
test.describe('Returning visitor edge cases', () => {
  test.describe('Declined by default, with existing deprecated cookies', () => {
    setTestStore('defaultConsentDisallowed_cookiesEnabled');

    test('keeps the deprecated cookies when no replacement values exist', async ({
      storefront,
    }) => {
      // The no-banner flow: consent is declined by the store's default and
      // the visitor never interacts with a banner.
      await storefront.setWithPrivacyBanner(false);

      // 1. Initial visit as a fresh visitor (no deprecated cookies yet).
      await storefront.goto('/');

      // 2. Model the visitor returning from an older storefront version:
      // the deprecated cookies are in the browser on the next load.
      const storefrontOrigin = new URL(storefront.page.url()).origin;
      await storefront.context.addCookies([
        {name: '_shopify_y', value: 'legacy-unique', url: storefrontOrigin},
        {name: '_shopify_s', value: 'legacy-visit', url: storefrontOrigin},
      ]);

      // 3. Returning visit. The consent response reports the store's
      // declined default: no tokens, and the declined consent value must be
      // published so the Customer Privacy API learns the visitor's state.
      const response = await storefront.withConsentResponse(() =>
        storefront.reload(),
      );
      await storefront.expectDeclinedConsent(response);

      // 4. Declined consent means no analytics at all.
      storefront.expectNoMonorailRequests();

      // 5. The deprecated cookies are removed by the no-consent clear path
      // once the declined state is learned: a declined visitor must not
      // keep tracking cookies, whatever happens to the deletion gate (which
      // stays closed here — no replacement tokens were published).
      await storefront.expectNoLegacyAnalyticsCookies();

      // 6. Reload: the declined state holds — no tokens, no analytics, and
      // the deprecated cookies stay removed.
      const reloadResponse = await storefront.withConsentResponse(() =>
        storefront.reload(),
      );
      await storefront.expectDeclinedConsent(reloadResponse);
      storefront.expectNoMonorailRequests();
      await storefront.expectNoLegacyAnalyticsCookies();
    });
  });

  test.describe('Accepted by default, after the deprecated cookies were removed', () => {
    setTestStore('defaultConsentAllowed_cookiesEnabled');

    test('keeps the session stable across reloads and does not resurrect the cookies', async ({
      storefront,
    }) => {
      test.setTimeout(120000);

      // The banner is enabled for the decline step at the end; it never
      // shows on this store because consent is allowed by default.
      await storefront.setWithPrivacyBanner(true);

      // === Establish the session as a new visitor ===
      const initialResponse = await storefront.withConsentResponse(() =>
        storefront.goto('/'),
      );
      const tokens = await storefront.expectAllowedConsent(initialResponse);
      await storefront.expectHttpOnlyAnalyticsCookiesPresent();
      await storefront.expectNoLegacyAnalyticsCookies();

      // === Model the returning visitor: only deprecated cookies remain ===
      const storefrontOrigin = new URL(storefront.page.url()).origin;
      await storefront.context.addCookies([
        {name: '_shopify_y', value: tokens.uniqueToken!, url: storefrontOrigin},
        {name: '_shopify_s', value: tokens.visitToken!, url: storefrontOrigin},
      ]);
      await storefront.removeHttpOnlyCookies();

      // === Migration reload: values forwarded, then cookies removed ===
      const migrationResponse = await storefront.withConsentResponse(() =>
        storefront.reload(),
      );
      expect(
        await storefront.expectAllowedConsent(migrationResponse),
        'Migration should preserve the original tokens',
      ).toEqual(tokens);
      await storefront.expectHttpOnlyAnalyticsCookiesPresent();
      // The deletion boundary: after this point the deprecated cookies are
      // gone and everything below must hold without them.
      await storefront.expectNoLegacyAnalyticsCookies();

      // === Session continuity without the deprecated cookies: reloads
      // across the deletion boundary keep the same tokens ===
      for (let reload = 1; reload <= 3; reload++) {
        const reloadResponse = await storefront.withConsentResponse(() =>
          storefront.reload(),
        );

        // The tokens come from the consent response and the Customer
        // Privacy API — the deleted cookies cannot be the source, so equal
        // values prove the session did not restart.
        expect(
          await storefront.expectAllowedConsent(reloadResponse),
          `Tokens should stay stable on reload ${reload} after deletion`,
        ).toEqual(tokens);

        // No resurrection: the deprecated cookies stay deleted.
        await storefront.expectNoLegacyAnalyticsCookies();
        await storefront.expectHttpOnlyAnalyticsCookiesPresent();
      }

      // Analytics after the final reload still carry the session tokens.
      await storefront.waitForMonorailRequests();
      storefront.verifyMonorailRequests(
        tokens.uniqueToken,
        tokens.visitToken,
        'after reloads without deprecated cookies',
      );

      // === Revoking consent after deletion: no resurrection, no analytics ===
      storefront.clearRequests();

      await storefront.openPrivacyPreferences();
      await storefront.expectDeclinedConsent(
        await storefront.declineInPreferences(),
      );

      // The deprecated cookies stay deleted after revoking consent.
      await storefront.expectNoLegacyAnalyticsCookies();
      // And no token-bearing analytics events fire after the revoke.
      storefront.expectNoMonorailRequests();

      // Navigation and reload keep holding the revoked state.
      const productResponse = await storefront.navigateToInStockProduct({
        waitForConsent: true,
      });
      await storefront.expectDeclinedConsent(productResponse);
      await storefront.expectNoLegacyAnalyticsCookies();

      const finalReload = await storefront.withConsentResponse(() =>
        storefront.reload(),
      );
      await storefront.expectDeclinedConsent(finalReload);
      await storefront.expectNoLegacyAnalyticsCookies();
      storefront.expectNoMonorailRequests();
    });
  });
});
