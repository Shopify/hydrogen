import {setTestStore, test, expect} from '../../fixtures';

/**
 * Client-side (SPA) route navigations must not re-run the consent flow: the
 * consent request fires once per full page load, the published values stay
 * in place, and the deprecated cookies are not written again.
 */
setTestStore('defaultConsentAllowed_cookiesEnabled');

test.describe('SPA route navigation', () => {
  test('keeps the published values and does not rewrite the deprecated cookies', async ({
    storefront,
  }) => {
    await storefront.setWithPrivacyBanner(false);

    // Count every consent request: one fires per full page load, so the
    // count staying flat proves the link clicks below are client-side
    // navigations, not full loads.
    const consentRequestUrls: string[] = [];
    storefront.page.on('request', (request) => {
      if (
        request.url().includes('graphql.json') &&
        request.method() === 'POST' &&
        (request.postData() ?? '').includes('consentManagement')
      ) {
        consentRequestUrls.push(request.url());
      }
    });

    // === Establish the session as a new visitor ===
    const initialResponse = await storefront.withConsentResponse(() =>
      storefront.goto('/'),
    );
    const tokens = await storefront.expectAllowedConsent(initialResponse);
    await storefront.waitForMonorailRequests();
    storefront.clearRequests();

    // === Model the returning visitor: only deprecated cookies remain ===
    const storefrontOrigin = new URL(storefront.page.url()).origin;
    await storefront.context.addCookies([
      {name: '_shopify_y', value: tokens.uniqueToken!, url: storefrontOrigin},
      {name: '_shopify_s', value: tokens.visitToken!, url: storefrontOrigin},
    ]);
    await storefront.removeHttpOnlyCookies();

    // Record every write of the deprecated cookies from here on, so the
    // deletion writes of the next (migration) load can be counted.
    await storefront.page.addInitScript(() => {
      const descriptor = Object.getOwnPropertyDescriptor(
        Document.prototype,
        'cookie',
      )!;
      (window as any).__deprecatedCookieWrites = [];
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: descriptor.get,
        set(value: string) {
          if (/^_shopify_[ys]=/.test(value)) {
            (window as any).__deprecatedCookieWrites.push(value);
          }
          descriptor.set!.call(document, value);
        },
      });
    });

    // === Migration load: the deprecated cookies are deleted once ===
    const migrationResponse = await storefront.withConsentResponse(() =>
      storefront.reload(),
    );
    expect(
      await storefront.expectAllowedConsent(migrationResponse),
      'Migration should preserve the original tokens',
    ).toEqual(tokens);
    await storefront.expectNoLegacyAnalyticsCookies();

    // One consent request per full page load: the initial visit plus the
    // migration reload.
    const consentRequestsAfterLoad = consentRequestUrls.length;
    expect(consentRequestsAfterLoad).toBe(2);

    // The deletion writes: exactly one expiry write per deprecated cookie.
    const writesAfterLoad = (await storefront.page.evaluate(
      () => (window as any).__deprecatedCookieWrites as string[],
    )) as string[];
    expect(writesAfterLoad.slice().sort()).toEqual([
      '_shopify_s=; Max-Age=0; Path=/; SameSite=Lax',
      '_shopify_y=; Max-Age=0; Path=/; SameSite=Lax',
    ]);

    // === Client-side navigations across routes ===
    // The header renders a hidden mobile-menu copy of each link; only the
    // visible one can be clicked.
    const catalogLink = storefront.page
      .locator('a[href="/collections/all"]:visible')
      .first();
    await expect(catalogLink).toBeVisible();
    await catalogLink.click();
    await expect(storefront.page).toHaveURL(/\/collections\/all/);

    const productLink = storefront.page
      .locator('a[href*="/products/"]')
      .first();
    await expect(productLink).toBeVisible();
    await productLink.click();
    await expect(storefront.page).toHaveURL(/\/products\//);

    // Still the same document: the consent request did not fire again and
    // the deprecated cookies were not written again.
    expect(consentRequestUrls.length).toBe(consentRequestsAfterLoad);
    const writesAfterNavigations = (await storefront.page.evaluate(
      () => (window as any).__deprecatedCookieWrites as string[],
    )) as string[];
    expect(writesAfterNavigations).toEqual(writesAfterLoad);
    await storefront.expectNoLegacyAnalyticsCookies();

    // The published values are unchanged: analytics events after the
    // navigations still carry the session tokens.
    expect(await storefront.getTrackingTokens()).toEqual(tokens);
    await storefront.waitForMonorailRequests();
    storefront.verifyMonorailRequests(
      tokens.uniqueToken,
      tokens.visitToken,
      'after SPA navigations',
    );
  });
});
