import {
  setTestStore,
  test,
  expect,
  ACCEPT_ALL_CONSENT,
  DECLINE_ALL_CONSENT,
} from '../../fixtures';

/**
 * Consent can exist in several places at once: backend-managed cookies, a
 * leftover legacy `_tracking_consent` cookie, and the Customer Privacy API's
 * sessionStorage copy of an earlier consent header (`consentHeader`). A stale
 * copy must never restore obsolete consent, nor skip the consent request that
 * loads the visitor's current choice.
 */
setTestStore('defaultConsentAllowed_cookiesEnabled');

// sessionStorage key the Customer Privacy API caches consent headers under.
const CONSENT_HEADER_STORAGE_KEY = 'consentHeader';

const STALE_CONSENT_HEADER_REASON =
  'Known gap: a consentHeader left in sessionStorage counts as stored consent, so the Customer Privacy API marks consent loaded without a request and applies the stale value';

test.describe('Mixed consent storage', () => {
  test.beforeEach(async ({storefront}) => {
    await storefront.setWithPrivacyBanner(false);
    await storefront.goto('/');
    await storefront.waitForConsentLoaded();
  });

  test('a stale legacy acceptance does not override a newer decline', async ({
    storefront,
  }) => {
    const accepted = await storefront.setTrackingConsent(ACCEPT_ALL_CONSENT);
    await storefront.setTrackingConsent(DECLINE_ALL_CONSENT);
    // The legacy mirror of the earlier acceptance is still in the browser.
    const origin = new URL(storefront.page.url()).origin;
    await storefront.context.addCookies([
      {name: '_tracking_consent', value: accepted.trackingConsent, url: origin},
      {name: '_shopify_y', value: accepted.uniqueToken!, url: origin},
      {name: '_shopify_s', value: accepted.visitToken!, url: origin},
    ]);

    await storefront.expectDeclinedConsent(
      await storefront.withConsentResponse(() => storefront.reload()),
    );
    await storefront.navigateClientSide('/collections/all');
    storefront.expectNoMonorailRequests();
    await storefront.expectNoLegacyCookies();
  });

  test('a stale legacy decline does not override a newer acceptance', async ({
    storefront,
  }) => {
    const declined = await storefront.setTrackingConsent(DECLINE_ALL_CONSENT);
    const accepted = await storefront.setTrackingConsent(ACCEPT_ALL_CONSENT);
    const origin = new URL(storefront.page.url()).origin;
    await storefront.context.addCookies([
      {name: '_tracking_consent', value: declined.trackingConsent, url: origin},
    ]);

    expect(
      await storefront.expectAllowedConsent(
        await storefront.withConsentResponse(() => storefront.reload()),
      ),
      'The newer acceptance keeps its session',
    ).toMatchObject({uniqueToken: accepted.uniqueToken});
    await storefront.expectNoLegacyCookies();
  });

  test('a stale consent header does not restore an earlier acceptance', async ({
    storefront,
  }) => {
    test.fail(true, STALE_CONSENT_HEADER_REASON);
    const accepted = await storefront.setTrackingConsent(ACCEPT_ALL_CONSENT);
    await storefront.setTrackingConsent(DECLINE_ALL_CONSENT);
    // For example, cached in this tab by an earlier storefront version that
    // still sent consent in Server-Timing.
    await storefront.page.evaluate(
      ([key, value]) => sessionStorage.setItem(key, value),
      // Stored decoded, as the Customer Privacy API caches it.
      [
        CONSENT_HEADER_STORAGE_KEY,
        decodeURIComponent(accepted.trackingConsent),
      ] as const,
    );
    const consentRequests = storefront.trackConsentRequests();

    await storefront.reload();
    await storefront.navigateClientSide('/collections/all');

    expect(
      consentRequests,
      'Stored consent must not skip the consent request',
    ).toHaveLength(1);
    await storefront.waitForConsentLoaded();
    expect(await storefront.getConsentState()).toMatchObject({
      analyticsAllowed: false,
      uniqueToken: null,
    });
    storefront.expectNoMonorailRequests();
  });
});
