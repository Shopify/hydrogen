import {test, expect} from '@playwright/test';
import {
  PRIVACY_BANNER_DIALOG_ID,
  DECLINE_BUTTON_ID,
  ANALYTICS_COOKIES,
  PERF_KIT_URL,
  MONORAIL_URL,
  MOCK_VALUE_PATTERN,
  getServerTimingValues,
  waitForConsentResponse,
  waitForPerfKit,
} from './utils';

test.describe('Privacy Banner - Decline Flow', () => {
  test('should not set analytics cookies or make analytics requests when user declines consent', async ({
    page,
  }) => {
    // Track network requests
    const analyticsRequests: string[] = [];
    const perfKitRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes(MONORAIL_URL)) {
        analyticsRequests.push(url);
      }
      if (url.includes(PERF_KIT_URL)) {
        perfKitRequests.push(url);
      }
    });

    // 1. Navigate to main page
    await page.goto(process.env.BASE_URL!);

    // Wait for the page to hydrate and initial requests to settle
    await page.waitForLoadState('networkidle');

    // 2. Check that server-timing values (_y and _s) are available via Performance API
    const initialServerTimingValues = await getServerTimingValues(page);

    expect(
      initialServerTimingValues._y,
      'Initial _y value should be present in server-timing',
    ).toBeTruthy();
    expect(
      initialServerTimingValues._s,
      'Initial _s value should be present in server-timing',
    ).toBeTruthy();
    expect(initialServerTimingValues._y!.length).toBeGreaterThan(0);
    expect(initialServerTimingValues._s!.length).toBeGreaterThan(0);

    // 3. Verify no analytics cookies are set yet
    const cookiesBefore = await page.context().cookies();
    for (const cookieName of ANALYTICS_COOKIES) {
      const cookie = cookiesBefore.find((c) => c.name.startsWith(cookieName));
      expect(
        cookie,
        `Cookie ${cookieName} should not be present before consent`,
      ).toBeUndefined();
    }

    // 3b. Verify no analytics requests have been made yet
    expect(
      analyticsRequests,
      'No analytics requests should be made before consent',
    ).toHaveLength(0);

    // 4. Verify perf-kit script is not downloaded yet
    expect(
      perfKitRequests,
      'Perf-kit script should not be downloaded before consent',
    ).toHaveLength(0);

    // 5. Verify privacy banner appears
    const privacyBanner = page.locator(`#${PRIVACY_BANNER_DIALOG_ID}`);
    await expect(privacyBanner).toBeVisible({timeout: 10000});

    // Set up response listener for the consent GraphQL response
    const responsePromise = waitForConsentResponse(page);

    // 6. Click on "decline" button
    const declineButton = page.locator(`#${DECLINE_BUTTON_ID}`);
    await expect(declineButton).toBeVisible();
    await declineButton.click();

    // Wait for the banner to close
    await expect(privacyBanner).not.toBeVisible();

    // Wait for the consent management GraphQL request and response
    const consentResponse = await responsePromise;
    expect(
      consentResponse.ok(),
      'Consent management request should succeed',
    ).toBe(true);

    // Wait for cookies to be updated and get new server timing
    await page.waitForLoadState('networkidle');

    // Verify _shopify_essential cookie is set after declining
    const cookiesAfterDecline = await page.context().cookies();
    const essentialCookie = cookiesAfterDecline.find(
      (c) =>
        c.name === '_shopify_essential' || c.name === '_shopify_essentials',
    );
    expect(
      essentialCookie,
      '_shopify_essential(s) cookie should be present after declining',
    ).toBeDefined();

    // 7. Verify analytics/marketing cookies are NOT set after declining
    for (const cookieName of ANALYTICS_COOKIES) {
      const cookie = cookiesAfterDecline.find((c) =>
        c.name.startsWith(cookieName),
      );
      expect(
        cookie,
        `Cookie ${cookieName} should not be present after declining consent`,
      ).toBeUndefined();
    }

    // 8. Verify server-timing values after decline are either absent or contain mock values
    const updatedServerTimingValues = await getServerTimingValues(page, true);

    // Server-timing _y and _s should either be absent or be mock values (all 0s with a 5)
    if (updatedServerTimingValues._y) {
      expect(
        MOCK_VALUE_PATTERN.test(updatedServerTimingValues._y),
        `Server-timing _y should be a mock value after decline, got: ${updatedServerTimingValues._y}`,
      ).toBe(true);
    }
    if (updatedServerTimingValues._s) {
      expect(
        MOCK_VALUE_PATTERN.test(updatedServerTimingValues._s),
        `Server-timing _s should be a mock value after decline, got: ${updatedServerTimingValues._s}`,
      ).toBe(true);
    }

    // 9. Verify perf-kit is downloaded after declining
    await waitForPerfKit(page);

    expect(
      perfKitRequests.length,
      'Perf-kit script should be downloaded after declining consent',
    ).toBeGreaterThan(0);

    // 10. Wait a couple of seconds and verify no analytics requests are made
    await page.waitForTimeout(3000);

    expect(
      analyticsRequests,
      'No analytics requests should be made after declining consent (even after waiting)',
    ).toHaveLength(0);

    // 11. Navigate to first product and add to cart to verify server-timing mock values
    const firstProduct = page.locator('.product-item').first();
    await firstProduct.click();
    await page.waitForLoadState('networkidle');

    // Add item to cart
    const addToCartButton = page
      .locator('button:has-text("Add to cart")')
      .first();
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();

    // Wait for cart update request to complete
    await page.waitForLoadState('networkidle');

    // Check server-timing from the latest resource (cart mutation response)
    const serverTimingAfterCart = await getServerTimingValues(page, true);

    // Server-timing _y and _s should be mock values after cart action (consent was declined)
    if (serverTimingAfterCart._y) {
      expect(
        MOCK_VALUE_PATTERN.test(serverTimingAfterCart._y),
        `Server-timing _y after cart action should be a mock value, got: ${serverTimingAfterCart._y}`,
      ).toBe(true);
    }
    if (serverTimingAfterCart._s) {
      expect(
        MOCK_VALUE_PATTERN.test(serverTimingAfterCart._s),
        `Server-timing _s after cart action should be a mock value, got: ${serverTimingAfterCart._s}`,
      ).toBe(true);
    }

    // Verify still no analytics requests after cart action
    expect(
      analyticsRequests,
      'No analytics requests should be made after cart action with declined consent',
    ).toHaveLength(0);

    // 12. Reload the page to verify persistence
    analyticsRequests.length = 0;
    perfKitRequests.length = 0;

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify privacy banner does NOT show up on reload (consent was saved)
    const privacyBannerAfterReload = page.locator(
      `#${PRIVACY_BANNER_DIALOG_ID}`,
    );
    await expect(privacyBannerAfterReload).not.toBeVisible();

    // Verify _shopify_essential cookie persists after reload
    const cookiesAfterReload = await page.context().cookies();
    const essentialCookieAfterReload = cookiesAfterReload.find(
      (c) =>
        c.name === '_shopify_essential' || c.name === '_shopify_essentials',
    );
    expect(
      essentialCookieAfterReload,
      '_shopify_essential(s) cookie should persist after reload',
    ).toBeDefined();

    // Verify analytics cookies are still not present after reload
    for (const cookieName of ANALYTICS_COOKIES) {
      const cookie = cookiesAfterReload.find((c) =>
        c.name.startsWith(cookieName),
      );
      expect(
        cookie,
        `Cookie ${cookieName} should not be present after page reload`,
      ).toBeUndefined();
    }

    // Wait for perf-kit to be downloaded after reload
    await waitForPerfKit(page);

    // Wait a couple more seconds and verify no analytics requests after reload
    await page.waitForTimeout(3000);

    expect(
      analyticsRequests,
      'No analytics requests should be made after page reload',
    ).toHaveLength(0);
  });
});
