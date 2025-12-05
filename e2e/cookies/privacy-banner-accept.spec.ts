import {setTestStore, test, expect} from '../fixtures';
import {
  PRIVACY_BANNER_DIALOG_ID,
  ACCEPT_BUTTON_ID,
  ANALYTICS_COOKIES,
  PERF_KIT_URL,
  MONORAIL_URL,
  getServerTimingValues,
  verifyMonorailRequests,
  waitForConsentResponse,
  waitForPerfKit,
} from './utils';

setTestStore('defaultConsentDisallowed_cookiesEnabled');

test.describe('Privacy Banner - Accept Flow', () => {
  test('should set analytics cookies and make analytics requests when user accepts consent', async ({
    page,
  }) => {
    // Track network requests
    const analyticsRequests: {url: string; postData?: string}[] = [];
    const perfKitRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes(MONORAIL_URL)) {
        analyticsRequests.push({
          url,
          postData: request.postData() || undefined,
        });
      }
      if (url.includes(PERF_KIT_URL)) {
        perfKitRequests.push(url);
      }
    });

    // 1. Navigate to main page
    await page.goto('/');

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

    // 3. Verify no analytics requests have been made and no analytics cookies are present
    const cookiesBefore = await page.context().cookies();
    for (const cookieName of ANALYTICS_COOKIES) {
      const cookie = cookiesBefore.find((c) => c.name.startsWith(cookieName));
      expect(
        cookie,
        `Cookie ${cookieName} should not be present before consent`,
      ).toBeUndefined();
    }

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

    // 6. Click on "accept" button
    const acceptButton = page.locator(`#${ACCEPT_BUTTON_ID}`);
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();

    // Wait for the banner to close
    await expect(privacyBanner).not.toBeVisible();

    // 7. Wait for the consent management GraphQL request and response
    const consentResponse = await responsePromise;
    expect(
      consentResponse.ok(),
      'Consent management request should succeed',
    ).toBe(true);

    // Verify server-timing values changed after consent
    // Wait for cookies to be updated and get new server timing
    await page.waitForLoadState('networkidle');

    // Get updated server timing values from the page (prefer latest resource entries)
    const updatedServerTimingValues = await getServerTimingValues(page, true);

    // 7b. Verify server-timing values after consent are different from initial values
    // The consent response should bring back different _y and _s values
    expect(
      updatedServerTimingValues._y,
      'Updated _y value should be present after consent',
    ).toBeTruthy();
    expect(
      updatedServerTimingValues._s,
      'Updated _s value should be present after consent',
    ).toBeTruthy();

    // Verify values changed from initial (new tracking session after consent)
    expect(
      updatedServerTimingValues._y,
      'Server-timing _y should be different after consent',
    ).not.toBe(initialServerTimingValues._y);
    expect(
      updatedServerTimingValues._s,
      'Server-timing _s should be different after consent',
    ).not.toBe(initialServerTimingValues._s);

    // 8. Verify _shopify_y and _shopify_s cookies are created with server-timing values
    const cookiesAfterAccept = await page.context().cookies();

    const shopifyYCookie = cookiesAfterAccept.find(
      (c) => c.name === '_shopify_y',
    );
    const shopifySCookie = cookiesAfterAccept.find(
      (c) => c.name === '_shopify_s',
    );

    expect(
      shopifyYCookie,
      '_shopify_y cookie should be present after accept',
    ).toBeDefined();
    expect(
      shopifySCookie,
      '_shopify_s cookie should be present after accept',
    ).toBeDefined();

    // The cookie values should match the LATEST server-timing values (from consent response)
    expect(
      shopifyYCookie!.value,
      '_shopify_y cookie value should match latest server-timing _y value',
    ).toBe(updatedServerTimingValues._y);

    expect(
      shopifySCookie!.value,
      '_shopify_s cookie value should match latest server-timing _s value',
    ).toBe(updatedServerTimingValues._s);

    // Verify HTTP-only cookies are set after consent
    // Playwright can see HTTP-only cookies via page.context().cookies()
    const shopifyAnalyticsCookie = cookiesAfterAccept.find(
      (c) => c.name === '_shopify_analytics',
    );
    const shopifyMarketingCookie = cookiesAfterAccept.find(
      (c) => c.name === '_shopify_marketing',
    );

    expect(
      shopifyAnalyticsCookie,
      '_shopify_analytics cookie should be present after accept',
    ).toBeDefined();
    expect(
      shopifyMarketingCookie,
      '_shopify_marketing cookie should be present after accept',
    ).toBeDefined();

    // Verify HTTP-only cookies have httpOnly flag set
    expect(
      shopifyAnalyticsCookie!.httpOnly,
      '_shopify_analytics cookie should be HTTP-only',
    ).toBe(true);
    expect(
      shopifyMarketingCookie!.httpOnly,
      '_shopify_marketing cookie should be HTTP-only',
    ).toBe(true);

    // 9. Wait for perf-kit to download and analytics requests to fire
    await waitForPerfKit(page);

    expect(
      perfKitRequests.length,
      'Perf-kit script should be downloaded after consent',
    ).toBeGreaterThan(0);

    // Wait for analytics requests to Monorail
    await expect
      .poll(
        () => analyticsRequests.length,
        'Analytics requests should be made after consent',
      )
      .toBeGreaterThan(0);

    // Verify the analytics requests contain the correct _y and _s values
    verifyMonorailRequests(
      analyticsRequests,
      updatedServerTimingValues._y!,
      updatedServerTimingValues._s!,
      'after consent',
    );

    // 10. Navigate to a product and add to cart to verify server-timing persists
    // Click on first product link
    const productLink = page.locator('a[href*="/products/"]').first();
    await expect(productLink).toBeVisible();
    await productLink.click();

    // Wait for product page to load
    await page.waitForLoadState('networkidle');

    // Find and click the "Add to cart" button
    const addToCartButton = page.locator(
      'button:has-text("Add to cart"), button:has-text("Add to Cart")',
    );
    await expect(addToCartButton).toBeVisible({timeout: 10000});
    await addToCartButton.click();

    // Wait for the cart mutation response
    await page.waitForLoadState('networkidle');

    // Verify server-timing values after cart mutation match the session values
    const serverTimingAfterCart = await getServerTimingValues(page, true);

    expect(
      serverTimingAfterCart._y,
      'Server-timing _y should be present after cart mutation',
    ).toBeTruthy();
    expect(
      serverTimingAfterCart._s,
      'Server-timing _s should be present after cart mutation',
    ).toBeTruthy();

    // Values should match the session established after consent
    expect(
      serverTimingAfterCart._y,
      'Server-timing _y after cart mutation should match session value',
    ).toBe(updatedServerTimingValues._y);
    expect(
      serverTimingAfterCart._s,
      'Server-timing _s after cart mutation should match session value',
    ).toBe(updatedServerTimingValues._s);

    // 11. Reload the page and verify state is preserved
    analyticsRequests.length = 0;
    perfKitRequests.length = 0;

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify privacy banner does NOT show up on reload (consent was saved)
    const privacyBannerAfterReload = page.locator(
      `#${PRIVACY_BANNER_DIALOG_ID}`,
    );
    await expect(privacyBannerAfterReload).not.toBeVisible();

    // Verify cookies are still present after reload
    const cookiesAfterReload = await page.context().cookies();

    const shopifyYAfterReload = cookiesAfterReload.find(
      (c) => c.name === '_shopify_y',
    );
    const shopifySAfterReload = cookiesAfterReload.find(
      (c) => c.name === '_shopify_s',
    );

    expect(
      shopifyYAfterReload,
      '_shopify_y cookie should persist after reload',
    ).toBeDefined();
    expect(
      shopifySAfterReload,
      '_shopify_s cookie should persist after reload',
    ).toBeDefined();

    // Verify HTTP-only cookies persist after reload
    const shopifyAnalyticsAfterReload = cookiesAfterReload.find(
      (c) => c.name === '_shopify_analytics',
    );
    const shopifyMarketingAfterReload = cookiesAfterReload.find(
      (c) => c.name === '_shopify_marketing',
    );

    expect(
      shopifyAnalyticsAfterReload,
      '_shopify_analytics cookie should persist after reload',
    ).toBeDefined();
    expect(
      shopifyMarketingAfterReload,
      '_shopify_marketing cookie should persist after reload',
    ).toBeDefined();

    // Verify server-timing values after reload match the values from before reload (same session)
    const serverTimingAfterReload = await getServerTimingValues(page);

    expect(
      serverTimingAfterReload._y,
      'Server-timing _y should be present after reload',
    ).toBeTruthy();
    expect(
      serverTimingAfterReload._s,
      'Server-timing _s should be present after reload',
    ).toBeTruthy();

    // Values should match the session established after consent (before reload)
    expect(
      serverTimingAfterReload._y,
      'Server-timing _y after reload should match value from before reload',
    ).toBe(updatedServerTimingValues._y);
    expect(
      serverTimingAfterReload._s,
      'Server-timing _s after reload should match value from before reload',
    ).toBe(updatedServerTimingValues._s);

    // Cookies should also match the server-timing values
    expect(
      shopifyYAfterReload?.value,
      '_shopify_y cookie after reload should match server-timing _y',
    ).toBe(updatedServerTimingValues._y);
    expect(
      shopifySAfterReload?.value,
      '_shopify_s cookie after reload should match server-timing _s',
    ).toBe(updatedServerTimingValues._s);

    // Wait for analytics requests after reload
    await expect
      .poll(
        () => analyticsRequests.length,
        'Analytics requests should be made after reload',
      )
      .toBeGreaterThan(0);

    // Verify analytics events after reload have correct values (matching session from before reload)
    verifyMonorailRequests(
      analyticsRequests,
      updatedServerTimingValues._y!,
      updatedServerTimingValues._s!,
      'after reload',
    );
  });
});
