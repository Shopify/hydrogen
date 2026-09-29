import {
  setTestStore,
  test,
  expect,
  ACCEPT_ALL_CONSENT,
  DECLINE_ALL_CONSENT,
} from '../../fixtures';

/**
 * Tabs of one browser session share cookies but each keeps its own in-memory
 * consent and token cache. A choice made in one tab must reach the others.
 */
setTestStore('defaultConsentDisallowed_cookiesEnabled');

// Significant edge case, shipped knowingly: it needs two tabs open with a
// revocation in one and client-side navigation in the other; the next full
// page load applies it. A fast follow-up in the Customer Privacy API
// (consent-tracking-api) will fix it; remove test.fail once it ships.
const CROSS_TAB_REVOCATION_REASON =
  'Known gap: each tab keeps its in-memory consent cache, so a revocation in another tab is not applied until the next full page load';

test.describe('Multiple tabs', () => {
  test('a second tab continues the accepted choice and session', async ({
    storefront,
  }) => {
    await storefront.setWithPrivacyBanner(false);
    await storefront.goto('/');
    await storefront.waitForConsentLoaded();
    const accepted = await storefront.setTrackingConsent(ACCEPT_ALL_CONSENT);

    const tab = await storefront.openTab({withPrivacyBanner: false});
    try {
      expect(
        await tab.expectAllowedConsent(
          await tab.withConsentResponse(() => tab.goto('/')),
        ),
      ).toEqual({
        uniqueToken: accepted.uniqueToken,
        visitToken: accepted.visitToken,
      });
      await tab.waitForMonorailRequests();
      tab.verifyMonorailRequests(
        accepted.uniqueToken!,
        accepted.visitToken!,
        'in a second tab',
      );
    } finally {
      await tab.page.close();
    }
  });

  test('a revocation in another tab stops analytics in the original tab', async ({
    storefront,
  }) => {
    test.fail(true, CROSS_TAB_REVOCATION_REASON);
    await storefront.setWithPrivacyBanner(false);
    await storefront.goto('/');
    await storefront.waitForConsentLoaded();
    await storefront.setTrackingConsent(ACCEPT_ALL_CONSENT);

    const tab = await storefront.openTab({withPrivacyBanner: false});
    try {
      await tab.goto('/');
      await tab.waitForConsentLoaded();
      await tab.setTrackingConsent(DECLINE_ALL_CONSENT);
    } finally {
      await tab.page.close();
    }

    // Back in the original tab, without a full page load.
    await storefront.page.bringToFront();
    storefront.clearRequests();
    await storefront.navigateClientSide('/collections/all');

    expect(await storefront.getConsentState()).toMatchObject({
      analyticsAllowed: false,
      uniqueToken: null,
    });
    storefront.expectNoMonorailRequests();
  });
});
