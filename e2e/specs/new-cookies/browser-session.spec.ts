import {setTestStore, test, expect} from '../../fixtures';

/**
 * Reopening the browser drops session cookies. The visitor's consent and
 * identity must survive through the persistent backend-managed cookies alone,
 * with no JavaScript-visible cookie to fall back on.
 */
test.describe('New browser session', () => {
  test.describe('Allowed by default', () => {
    setTestStore('defaultConsentAllowed_cookiesEnabled');

    test('keeps the visitor and session without showing the banner', async ({
      storefront,
    }) => {
      await storefront.setWithPrivacyBanner(true);
      const tokens = await storefront.expectAllowedConsent(
        await storefront.withConsentResponse(() => storefront.goto('/')),
      );

      const session = await storefront.openNewBrowserSession({
        withPrivacyBanner: true,
      });
      try {
        const response = await session.withConsentResponse(() =>
          session.goto('/'),
        );
        // Within the 30-minute visit window the visit continues as well.
        expect(await session.expectAllowedConsent(response)).toEqual(tokens);
        await session.expectPrivacyBannerNotVisible();
        await session.expectNoLegacyAnalyticsCookies();
        await session.waitForMonorailRequests();
        session.verifyMonorailRequests(
          tokens.uniqueToken!,
          tokens.visitToken!,
          'in a new browser session',
        );
      } finally {
        await session.context.close();
      }
    });
  });

  test.describe('Declined by default, with the privacy banner', () => {
    setTestStore('defaultConsentDisallowed_cookiesEnabled');

    test('keeps an accepted choice and session', async ({storefront}) => {
      await storefront.setWithPrivacyBanner(true);
      await storefront.goto('/');
      const tokens = await storefront.expectAllowedConsent(
        await storefront.acceptPrivacyBanner(),
      );

      const session = await storefront.openNewBrowserSession({
        withPrivacyBanner: true,
      });
      try {
        const response = await session.withConsentResponse(() =>
          session.goto('/'),
        );
        expect(await session.expectAllowedConsent(response)).toEqual(tokens);
        await session.expectPrivacyBannerNotVisible();
      } finally {
        await session.context.close();
      }
    });

    test('keeps a declined choice', async ({storefront}) => {
      await storefront.setWithPrivacyBanner(true);
      await storefront.goto('/');
      await storefront.expectDeclinedConsent(
        await storefront.declinePrivacyBanner(),
      );

      const session = await storefront.openNewBrowserSession({
        withPrivacyBanner: true,
      });
      try {
        const response = await session.withConsentResponse(() =>
          session.goto('/'),
        );
        await session.expectDeclinedConsent(response);
        await session.expectPrivacyBannerNotVisible();
        await session.expectNoAnalyticsCookies();
        session.expectNoMonorailRequests();
      } finally {
        await session.context.close();
      }
    });
  });
});
