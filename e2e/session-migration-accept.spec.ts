import {test, expect} from '@playwright/test';
import {
  PRIVACY_BANNER_DIALOG_ID,
  getServerTimingValues,
  mockConsentResponse,
} from './specs/cookies/utils';

test.describe('Session Migration - Accept Flow', () => {
  test('should preserve Y/S values when HTTP-only cookies are removed and page is reloaded', async ({
    page,
    context,
  }) => {
    // 1. Set up mock consent response to simulate "allowed by default" region
    // This avoids needing to click accept on the privacy banner
    const stopMocking = await mockConsentResponse(page, 'allowed');

    // 2. Navigate to main page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 3. Privacy banner should NOT appear (consent allowed by default)
    const privacyBanner = page.locator(`#${PRIVACY_BANNER_DIALOG_ID}`);
    await expect(privacyBanner).not.toBeVisible();

    // 4. Get the established Y/S values
    const establishedServerTiming = await getServerTimingValues(page, true);

    expect(
      establishedServerTiming._y,
      'Y value should be present',
    ).toBeTruthy();
    expect(
      establishedServerTiming._s,
      'S value should be present',
    ).toBeTruthy();

    // Verify they are real UUIDs (not mock values)
    expect(
      establishedServerTiming._y,
      'Y value should be a real UUID',
    ).not.toMatch(/^0+[-0]/);
    expect(
      establishedServerTiming._s,
      'S value should be a real UUID',
    ).not.toMatch(/^0+[-0]/);

    const establishedYValue = establishedServerTiming._y!;
    const establishedSValue = establishedServerTiming._s!;

    // 5. Verify all cookies are present
    const cookiesAfterLoad = await context.cookies();

    const shopifyYCookie = cookiesAfterLoad.find(
      (c) => c.name === '_shopify_y',
    );
    const shopifySCookie = cookiesAfterLoad.find(
      (c) => c.name === '_shopify_s',
    );
    const shopifyAnalyticsCookie = cookiesAfterLoad.find(
      (c) => c.name === '_shopify_analytics',
    );
    const shopifyMarketingCookie = cookiesAfterLoad.find(
      (c) => c.name === '_shopify_marketing',
    );

    expect(shopifyYCookie, '_shopify_y should exist').toBeDefined();
    expect(shopifySCookie, '_shopify_s should exist').toBeDefined();
    expect(
      shopifyAnalyticsCookie,
      '_shopify_analytics should exist',
    ).toBeDefined();
    expect(
      shopifyMarketingCookie,
      '_shopify_marketing should exist',
    ).toBeDefined();

    // Verify Y/S cookie values match server-timing
    expect(shopifyYCookie!.value, '_shopify_y should match server-timing').toBe(
      establishedYValue,
    );
    expect(shopifySCookie!.value, '_shopify_s should match server-timing').toBe(
      establishedSValue,
    );

    // 6. Remove ONLY the new HTTP-only cookies (simulate migration scenario)
    // Keep: _shopify_y, _shopify_s, _tracking_consent, _cmp_a
    // Remove: _shopify_analytics, _shopify_marketing, _shopify_essential(s)
    const baseUrl = new URL('/');

    const cookiesToRemove = cookiesAfterLoad.filter(
      (c) =>
        c.name === '_shopify_analytics' ||
        c.name === '_shopify_marketing' ||
        c.name === '_shopify_essential' ||
        c.name === '_shopify_essentials',
    );

    for (const cookie of cookiesToRemove) {
      await context.clearCookies({name: cookie.name, domain: baseUrl.hostname});
    }

    // Verify HTTP-only cookies are removed
    const cookiesAfterRemoval = await context.cookies();
    expect(
      cookiesAfterRemoval.find((c) => c.name === '_shopify_analytics'),
      '_shopify_analytics should be removed',
    ).toBeUndefined();
    expect(
      cookiesAfterRemoval.find((c) => c.name === '_shopify_marketing'),
      '_shopify_marketing should be removed',
    ).toBeUndefined();

    // Verify legacy cookies are still present
    const yAfterRemoval = cookiesAfterRemoval.find(
      (c) => c.name === '_shopify_y',
    );
    const sAfterRemoval = cookiesAfterRemoval.find(
      (c) => c.name === '_shopify_s',
    );
    expect(yAfterRemoval, '_shopify_y should still exist').toBeDefined();
    expect(sAfterRemoval, '_shopify_s should still exist').toBeDefined();
    expect(yAfterRemoval!.value, '_shopify_y value should be unchanged').toBe(
      establishedYValue,
    );
    expect(sAfterRemoval!.value, '_shopify_s value should be unchanged').toBe(
      establishedSValue,
    );

    // 7. Reload the page - this simulates the migration scenario
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 8. Privacy banner should still NOT show
    await expect(privacyBanner).not.toBeVisible();

    // 9. Verify server-timing Y/S values match the original established values
    const serverTimingAfterReload = await getServerTimingValues(page);

    expect(
      serverTimingAfterReload._y,
      'Server-timing _y after reload should match original value',
    ).toBe(establishedYValue);
    expect(
      serverTimingAfterReload._s,
      'Server-timing _s after reload should match original value',
    ).toBe(establishedSValue);

    // 10. Verify new HTTP-only cookies are recreated
    const cookiesAfterReload = await context.cookies();

    const analyticsAfterReload = cookiesAfterReload.find(
      (c) => c.name === '_shopify_analytics',
    );
    const marketingAfterReload = cookiesAfterReload.find(
      (c) => c.name === '_shopify_marketing',
    );

    expect(
      analyticsAfterReload,
      '_shopify_analytics should be recreated after reload',
    ).toBeDefined();
    expect(
      marketingAfterReload,
      '_shopify_marketing should be recreated after reload',
    ).toBeDefined();

    // Verify they are HTTP-only
    expect(
      analyticsAfterReload!.httpOnly,
      '_shopify_analytics should be HTTP-only',
    ).toBe(true);
    expect(
      marketingAfterReload!.httpOnly,
      '_shopify_marketing should be HTTP-only',
    ).toBe(true);

    // 11. Verify _shopify_y and _shopify_s cookies still have original values
    const yAfterReload = cookiesAfterReload.find(
      (c) => c.name === '_shopify_y',
    );
    const sAfterReload = cookiesAfterReload.find(
      (c) => c.name === '_shopify_s',
    );

    expect(
      yAfterReload,
      '_shopify_y should persist after reload',
    ).toBeDefined();
    expect(
      sAfterReload,
      '_shopify_s should persist after reload',
    ).toBeDefined();
    expect(yAfterReload!.value, '_shopify_y should keep original value').toBe(
      establishedYValue,
    );
    expect(sAfterReload!.value, '_shopify_s should keep original value').toBe(
      establishedSValue,
    );

    // Clean up
    await stopMocking();
  });
});
