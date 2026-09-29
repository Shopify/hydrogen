import {
  setTestStore,
  test,
  expect,
  type StorefrontPage,
  MOCK_VALUE_PATTERN,
} from '../../fixtures';
import {
  holdRequests,
  isPersistenceRequest,
  trackSuccessfulPersistence,
} from '../../fixtures/consent-test-controls';

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
const ABSOLUTE_VISIT_LIFETIME_REASON =
  'Known gap: the cached visit token expires 30 minutes after it was cached, not after 30 minutes without activity, so an active visitor starts a new visit';
const UNRETRIED_PERSISTENCE_REASON =
  'Known gap: a failed renewal persistence is not retried, so the next page load reports a different visit than the analytics already sent';

// Activity shortly before the visit timeout, and shortly after it.
const BEFORE_TIMEOUT_IN_MILLISECONDS = 28 * 60 * 1000;
const PAST_TIMEOUT_AFTER_ACTIVITY_IN_MILLISECONDS = 4 * 60 * 1000;
const TRACKING_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** Resume after being idle: one client-side navigation that fires analytics. */
async function resumeWithNavigation(
  storefront: StorefrontPage,
  path: '/' | '/collections/all' = '/collections/all',
) {
  storefront.clearRequests();
  await storefront.navigateClientSide(path);
  await storefront.waitForMonorailRequests();
  return storefront.getTrackingTokens();
}

test.describe('Page open for more than 30 minutes', () => {
  test('renews the visit, keeps the visitor, and persists the new visit', async ({
    storefront,
  }) => {
    await storefront.page.clock.install();
    const persistence = trackSuccessfulPersistence(storefront.page);
    const before = await establishCartSession(storefront);

    await storefront.page.clock.fastForward(IDLE_IN_MILLISECONDS);
    const after = await resumeWithNavigation(storefront);

    expect(after.uniqueToken, 'The visitor continues').toBe(before.uniqueToken);
    expect(after.visitToken, 'A new visit starts').not.toBe(before.visitToken);
    expect(
      [...new Set(storefront.getMonorailTokens().map((e) => e.visitToken))],
      'Analytics report the renewed visit',
    ).toEqual([after.visitToken]);
    await persistence.waitFor(after.visitToken);
    persistence.stop();

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

  test('refreshes an existing cart link after idle without navigation', async ({
    storefront,
  }) => {
    test.fail(true, STALE_CHECKOUT_URL_REASON);
    await storefront.page.clock.install();
    const before = await establishCartSession(storefront);

    await storefront.page.clock.fastForward(IDLE_IN_MILLISECONDS);
    // No navigation or cart mutation that could refresh the checkout link.
    await storefront.openCartAside();
    const checkout = await storefront.getCheckoutUrlTrackingParams();

    expect(checkout.uniqueToken, 'The visitor continues').toBe(
      before.uniqueToken,
    );
    expect(
      checkout.visitToken,
      'The link must contain a valid replacement visit',
    ).toMatch(TRACKING_TOKEN_PATTERN);
    expect(checkout.visitToken).not.toMatch(MOCK_VALUE_PATTERN);
    expect(
      checkout.visitToken,
      'Checkout must not continue the expired visit',
    ).not.toBe(before.visitToken);
  });

  test('keeps the visit while the visitor stays active', async ({
    storefront,
  }) => {
    test.fail(true, ABSOLUTE_VISIT_LIFETIME_REASON);
    await storefront.page.clock.install();
    await storefront.setWithPrivacyBanner(false);
    await storefront.goto('/');
    await storefront.waitForConsentLoaded();
    const before = await storefront.getTrackingTokens();

    await storefront.page.clock.fastForward(BEFORE_TIMEOUT_IN_MILLISECONDS);
    expect(
      await resumeWithNavigation(storefront),
      'Within 30 minutes the visit continues',
    ).toEqual(before);

    // Past 30 minutes since the visit began, but only minutes since the
    // last activity: the visit should still continue.
    await storefront.page.clock.fastForward(
      PAST_TIMEOUT_AFTER_ACTIVITY_IN_MILLISECONDS,
    );
    const after = await resumeWithNavigation(storefront, '/');
    expect(after, 'An active visitor keeps the visit').toEqual(before);
  });

  test('waits for a slow renewal persistence without renewing again', async ({
    storefront,
  }) => {
    await storefront.page.clock.install();
    await storefront.setWithPrivacyBanner(false);
    await storefront.goto('/');
    await storefront.waitForConsentLoaded();
    const before = await storefront.getTrackingTokens();

    const persistence = trackSuccessfulPersistence(storefront.page);
    const heldPersistence = await holdRequests(
      storefront.page,
      isPersistenceRequest,
    );
    try {
      await storefront.page.clock.fastForward(IDLE_IN_MILLISECONDS);
      const renewed = await resumeWithNavigation(storefront);
      await heldPersistence.waitUntilHeld();
      heldPersistence.expectPending();
      expect(renewed.uniqueToken).toBe(before.uniqueToken);
      expect(renewed.visitToken).not.toBe(before.visitToken);

      // Another navigation must reuse the token while its first write is still held.
      await storefront.navigateClientSide('/');
      expect(await storefront.getTrackingTokens()).toEqual(renewed);
      heldPersistence.expectPending();
      heldPersistence.release();
      await persistence.waitFor(renewed.visitToken);
      const response = await storefront.withConsentResponse(() =>
        storefront.reload(),
      );
      expect(await storefront.expectAllowedConsent(response)).toEqual(renewed);
    } finally {
      await heldPersistence.dispose();
      persistence.stop();
    }
  });

  test('persists a renewal after a failed attempt once the network recovers', async ({
    storefront,
  }) => {
    test.fail(true, UNRETRIED_PERSISTENCE_REASON);
    await storefront.page.clock.install();
    await storefront.setWithPrivacyBanner(false);
    await storefront.goto('/');
    await storefront.waitForConsentLoaded();
    const before = await storefront.getTrackingTokens();

    let failedPersistRequests = 0;
    await storefront.page.route('**/graphql.json**', (route) => {
      if (!isPersistenceRequest(route.request())) return route.continue();
      failedPersistRequests++;
      return route.abort('failed');
    });

    await storefront.page.clock.fastForward(IDLE_IN_MILLISECONDS);
    const renewed = await resumeWithNavigation(storefront);
    expect(renewed.uniqueToken).toBe(before.uniqueToken);
    await expect.poll(() => failedPersistRequests).toBeGreaterThan(0);

    // No token churn: further activity keeps the same renewed visit.
    await storefront.navigateClientSide('/');
    expect(await storefront.getTrackingTokens()).toEqual(renewed);

    // Recovery must happen in this document, before a reload discards retry state.
    const persistence = trackSuccessfulPersistence(storefront.page);
    await storefront.page.unroute('**/graphql.json**');
    await storefront.page.evaluate(() =>
      window.dispatchEvent(new Event('online')),
    );
    await resumeWithNavigation(storefront);
    await persistence.waitFor(renewed.visitToken);
    persistence.stop();
    const response = await storefront.withConsentResponse(() =>
      storefront.reload(),
    );
    expect(
      await storefront.expectAllowedConsent(response),
      'The backend continues the visit analytics already reported',
    ).toEqual(renewed);
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
    const before = await establishCartSession(storefront);

    // The idle time is what this test measures, so a fixed wait is intended.
    await storefront.page.waitForTimeout(IDLE_IN_MILLISECONDS);

    // Straight to checkout from the existing cart, before any navigation.
    await storefront.openCartAside();
    const immediateCheckoutEvents = await storefront.collectCheckoutAnalytics(
      (await storefront.getCheckoutUrlTrackingParams()).checkoutUrl,
      {expectTokens: true},
    );
    expect
      .soft(
        immediateCheckoutEvents
          .filter((event) => event.visitToken)
          .map((event) => event.visitToken),
        'Checkout must not continue the expired visit',
      )
      .not.toContain(before.visitToken);
    await storefront.closeCartAside();

    const persistence = trackSuccessfulPersistence(storefront.page);
    const heldPersistence = await holdRequests(
      storefront.page,
      isPersistenceRequest,
    );
    try {
      const after = await resumeWithNavigation(storefront);
      await heldPersistence.waitUntilHeld();
      heldPersistence.expectPending();
      expect(after.visitToken).toMatch(TRACKING_TOKEN_PATTERN);
      expect(after.visitToken).not.toMatch(MOCK_VALUE_PATTERN);

      await storefront.openCartAside();
      let signalCheckoutClick!: () => void;
      const checkoutClicked = new Promise<void>((resolve) => {
        signalCheckoutClick = resolve;
      });
      await storefront.page.exposeFunction(
        '__checkoutClicked',
        signalCheckoutClick,
      );
      await storefront.getCheckoutButton().evaluate((link) => {
        link.addEventListener(
          'click',
          () => {
            void (window as any).__checkoutClicked();
          },
          {capture: true, once: true},
        );
      });
      const checkoutHandoff = storefront.collectCheckoutAnalyticsFromCart({
        expectTokens: true,
      });
      // Observe rejection now, even if a broken immediate navigation cancels persistence.
      void checkoutHandoff.catch(() => {});
      await checkoutClicked;
      heldPersistence.expectPending();
      heldPersistence.release();
      await persistence.waitFor(after.visitToken);
      storefront.expectCheckoutContinuesSession(await checkoutHandoff, {
        uniqueToken: after.uniqueToken!,
        visitToken: after.visitToken!,
      });
    } finally {
      await heldPersistence.dispose();
      persistence.stop();
    }
  });
});
