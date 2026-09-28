import {setTestStore, test, expect, type StorefrontPage} from '../../fixtures';

/**
 * A visit ends after 30 minutes without a new visit token. On a page left
 * open that long, the Customer Privacy API renews the visit token on the next
 * read, keeps the unique token, and persists the new visit to the backend.
 *
 * The fast tests move only the browser clock (Playwright installs it on the
 * whole browser context, so a checkout tab would run ahead too); they assert
 * the storefront and the checkout link. The real-time test waits for real and
 * also asserts what checkout reports. It is opt-in because it holds a worker
 * for over 30 minutes: E2E_REAL_TIME_SESSION=1 pnpm e2e:new-cookies -g "real time"
 */
setTestStore('defaultConsentAllowed_cookiesEnabled');

const VISIT_TIMEOUT_IN_MINUTES = 30;
const IDLE_IN_MINUTES = VISIT_TIMEOUT_IN_MINUTES + 1;
const IDLE_IN_MILLISECONDS = IDLE_IN_MINUTES * 60 * 1000;
const REAL_TIME_TEST_MARGIN_IN_MILLISECONDS = 5 * 60 * 1000;

const STALE_CHECKOUT_URL_REASON =
  'Known gap: token renewal does not revalidate the cart, so its checkout URL keeps the expired visit token';

async function establishCartSession(storefront: StorefrontPage) {
  await storefront.setWithPrivacyBanner(false);
  await storefront.goto('/');
  await storefront.navigateToInStockProduct();
  await storefront.waitForConsentLoaded();
  const tokens = await storefront.getTrackingTokens();
  await storefront.addToCart();
  expect(await storefront.getCheckoutUrlTrackingParams()).toMatchObject({
    ...tokens,
  });
  await storefront.closeCartAside();
  return tokens;
}

/** Record the visit tokens sent to persist renewed tracking values. */
function trackPersistedVisitTokens(storefront: StorefrontPage) {
  const visitTokens: string[] = [];
  storefront.page.on('request', (request) => {
    const url = new URL(request.url());
    if (!url.pathname.endsWith('graphql.json')) return;
    const visitToken = url.searchParams.get('_s');
    if (visitToken) visitTokens.push(visitToken);
  });
  return visitTokens;
}

/** Resume after being idle: one client-side navigation that fires analytics. */
async function resumeWithNavigation(storefront: StorefrontPage) {
  storefront.clearRequests();
  await storefront.page
    .locator('a[href="/collections/all"]:visible')
    .first()
    .click();
  await expect(storefront.page).toHaveURL(/\/collections\/all/);
  await storefront.waitForMonorailRequests();
  return storefront.getTrackingTokens();
}

test.describe('Page open for more than 30 minutes', () => {
  test('renews the visit, keeps the visitor, and persists the new visit', async ({
    storefront,
  }) => {
    await storefront.page.clock.install();
    const persistedVisitTokens = trackPersistedVisitTokens(storefront);
    const before = await establishCartSession(storefront);

    await storefront.page.clock.fastForward(IDLE_IN_MILLISECONDS);
    const after = await resumeWithNavigation(storefront);

    expect(after.uniqueToken, 'The visitor continues').toBe(before.uniqueToken);
    expect(after.visitToken, 'A new visit starts').not.toBe(before.visitToken);
    expect(
      [...new Set(storefront.getMonorailTokens().map((e) => e.visitToken))],
      'Analytics report the renewed visit',
    ).toEqual([after.visitToken]);
    await expect.poll(() => persistedVisitTokens).toContain(after.visitToken);

    // The backend adopted the renewed visit for the next page load.
    const reloadResponse = await storefront.withConsentResponse(() =>
      storefront.reload(),
    );
    expect(await storefront.expectAllowedConsent(reloadResponse)).toEqual(
      after,
    );
  });

  test('refreshes the checkout link with the renewed visit', async ({
    storefront,
  }) => {
    test.fail(true, STALE_CHECKOUT_URL_REASON);
    await storefront.page.clock.install();
    await establishCartSession(storefront);

    await storefront.page.clock.fastForward(IDLE_IN_MILLISECONDS);
    const after = await resumeWithNavigation(storefront);

    await storefront.openCartAside();
    expect(await storefront.getCheckoutUrlTrackingParams()).toMatchObject({
      ...after,
    });
  });

  test('continues the renewed visit in checkout (real time)', async ({
    storefront,
  }) => {
    test.skip(
      !process.env.E2E_REAL_TIME_SESSION,
      'Set E2E_REAL_TIME_SESSION=1 to wait out a real visit timeout',
    );
    test.fail(true, STALE_CHECKOUT_URL_REASON);
    test.setTimeout(
      IDLE_IN_MILLISECONDS + REAL_TIME_TEST_MARGIN_IN_MILLISECONDS,
    );
    await establishCartSession(storefront);

    // The idle time is what this test measures, so a fixed wait is intended.
    await storefront.page.waitForTimeout(IDLE_IN_MILLISECONDS);
    const after = await resumeWithNavigation(storefront);
    expect(after.visitToken).not.toBeNull();

    await storefront.openCartAside();
    const {checkoutUrl} = await storefront.getCheckoutUrlTrackingParams();
    storefront.expectCheckoutContinuesSession(
      await storefront.collectCheckoutAnalytics(checkoutUrl, {
        expectTokens: true,
      }),
      {uniqueToken: after.uniqueToken!, visitToken: after.visitToken!},
    );
  });
});
