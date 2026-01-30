import type {Page, BrowserContext} from '@playwright/test';
import {expect} from '@playwright/test';

// Privacy Banner element IDs
export const PRIVACY_BANNER_DIALOG_ID = 'shopify-pc__banner';
export const ACCEPT_BUTTON_ID = 'shopify-pc__banner__btn-accept';
export const DECLINE_BUTTON_ID = 'shopify-pc__banner__btn-decline';

// Privacy Preferences element IDs
export const PRIVACY_PREFS_DIALOG_ID = 'shopify-pc__prefs__dialog';
export const PREFS_ACCEPT_BUTTON_ID = 'shopify-pc__prefs__header-accept';
export const PREFS_DECLINE_BUTTON_ID = 'shopify-pc__prefs__header-decline';

// Cookies that require consent
export const ANALYTICS_COOKIES = [
  '_shopify_analytics',
  '_shopify_marketing',
  '_shopify_y',
  '_shopify_s',
];

// URL patterns for network request tracking
export const PERF_KIT_URL = 'cdn.shopify.com/shopifycloud/perf-kit';
export const MONORAIL_BATCH_URL = '/produce_batch'; // Shopify Analytics batch endpoint
export const MONORAIL_PRODUCE_URL = '/v1/produce'; // Perf-kit endpoint
export const GRAPHQL_URL = 'graphql.json';

// Mock value pattern for declined consent (all zeros with a 5)
export const MOCK_VALUE_PATTERN = /^00000000\-0000\-0000\-5000\-000000000000$/;

export interface ServerTimingValues {
  _y?: string;
  _s?: string;
}

export interface MonorailPayload {
  unique_token?: string;
  deprecated_visit_token?: string;
  uniqToken?: string;
  visitToken?: string;
  // Perf-kit specific fields
  session_token?: string;
  micro_session_id?: string;
}

export interface AnalyticsRequest {
  url: string;
  postData?: string;
  initiator?: string; // Script URL that initiated the request
}

/**
 * Storefront fixture for e2e testing common storefront operations.
 * Provides methods for interacting with privacy banners, cookies, analytics, and cart.
 */
export class StorefrontPage {
  readonly page: Page;
  readonly context: BrowserContext;

  // Separated request arrays for clarity
  readonly monorailRequests: AnalyticsRequest[] = [];
  readonly perfKitProduceRequests: AnalyticsRequest[] = [];

  // Track if perf-kit script has been loaded
  private perfKitScriptLoaded = false;

  private requestInitiators: Map<string, string> = new Map();

  constructor(page: Page) {
    this.page = page;
    this.context = page.context();
    this.setupRequestTracking();
  }

  private setupRequestTracking() {
    // Use CDP to track request initiators (which script initiated the request)
    this.page.context().on('page', async (newPage) => {
      await this.setupCDPTracking(newPage);
    });
    // Also set up for the current page
    this.setupCDPTracking(this.page).catch(() => {
      // Ignore errors if CDP isn't available
    });

    this.page.on('request', (request) => {
      const url = request.url();

      // Track Monorail batch requests (Shopify Analytics)
      if (url.includes(MONORAIL_BATCH_URL)) {
        this.monorailRequests.push({
          url,
          postData: request.postData() || undefined,
          initiator: this.requestInitiators.get(url),
        });
      }

      // Track perf-kit produce requests (/v1/produce but not /produce_batch)
      if (
        url.includes(MONORAIL_PRODUCE_URL) &&
        !url.includes(MONORAIL_BATCH_URL)
      ) {
        this.perfKitProduceRequests.push({
          url,
          postData: request.postData() || undefined,
          initiator: this.requestInitiators.get(url),
        });
      }

      // Track perf-kit script download
      if (url.includes(PERF_KIT_URL)) {
        this.perfKitScriptLoaded = true;
      }
    });
  }

  /**
   * Chrome DevTools Protocol setup to track request initiators.
   */
  private async setupCDPTracking(page: Page) {
    try {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Network.enable');

      cdp.on('Network.requestWillBeSent', (event: any) => {
        const url = event.request.url;
        // Extract initiator URL from the stack trace or URL
        const initiatorUrl =
          event.initiator?.url ||
          event.initiator?.stack?.callFrames?.[0]?.url ||
          '';
        if (initiatorUrl) {
          this.requestInitiators.set(url, initiatorUrl);
        }
      });
    } catch {
      // CDP might not be available in all browsers
    }
  }

  /**
   * Navigate to a page and wait for network idle
   */
  async goto(path = '/') {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get server-timing values (_y and _s) from the Performance API
   * @param preferLatestResource - If true, prefer the latest resource entry over navigation timing
   */
  async getServerTimingValues(
    preferLatestResource = false,
  ): Promise<ServerTimingValues> {
    return this.page.evaluate((preferLatest) => {
      const result: {_y?: string; _s?: string} = {};

      // Get values from resource timing entries (latest entries first)
      const resourceEntries = performance.getEntriesByType(
        'resource',
      ) as PerformanceResourceTiming[];

      // Reverse to get latest entries first
      for (const entry of [...resourceEntries].reverse()) {
        if (entry.serverTiming) {
          for (const {name, description} of entry.serverTiming) {
            if (name === '_y' && description && !result._y) {
              result._y = description;
            } else if (name === '_s' && description && !result._s) {
              result._s = description;
            }
          }
        }
        if (result._y && result._s) break;
      }

      // Fall back to navigation timing if resource entries don't have values
      // or if we explicitly don't prefer latest
      if (!preferLatest || (!result._y && !result._s)) {
        const navigationEntry = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming;

        if (navigationEntry?.serverTiming) {
          for (const {name, description} of navigationEntry.serverTiming) {
            if (name === '_y' && description && !result._y) {
              result._y = description;
            } else if (name === '_s' && description && !result._s) {
              result._s = description;
            }
          }
        }
      }

      return result;
    }, preferLatestResource);
  }

  /**
   * Get all cookies from the browser context
   */
  async getCookies() {
    return this.context.cookies();
  }

  /**
   * Get a specific cookie by name
   */
  async getCookie(name: string) {
    const cookies = await this.getCookies();
    return cookies.find((c) => c.name === name);
  }

  /**
   * Assert that no analytics cookies are present
   */
  async expectNoAnalyticsCookies() {
    const cookies = await this.getCookies();
    for (const cookieName of ANALYTICS_COOKIES) {
      const cookie = cookies.find((c) => c.name.startsWith(cookieName));
      expect(
        cookie,
        `Cookie ${cookieName} should not be present`,
      ).toBeUndefined();
    }
  }

  /**
   * Assert that analytics cookies are present and return them
   */
  async expectAnalyticsCookiesPresent() {
    const cookies = await this.getCookies();
    const shopifyY = cookies.find((c) => c.name === '_shopify_y');
    const shopifyS = cookies.find((c) => c.name === '_shopify_s');
    const shopifyAnalytics = cookies.find(
      (c) => c.name === '_shopify_analytics',
    );
    const shopifyMarketing = cookies.find(
      (c) => c.name === '_shopify_marketing',
    );

    expect(shopifyY, '_shopify_y cookie should be present').toBeDefined();
    expect(shopifyS, '_shopify_s cookie should be present').toBeDefined();

    return {shopifyY, shopifyS, shopifyAnalytics, shopifyMarketing};
  }

  /**
   * Assert that essential cookie is present (set after declining consent)
   */
  async expectEssentialCookiePresent() {
    const cookies = await this.getCookies();
    const essentialCookie = cookies.find(
      (c) =>
        c.name === '_shopify_essential' || c.name === '_shopify_essentials',
    );

    expect(
      essentialCookie,
      '_shopify_essential(s) cookie should be present',
    ).toBeDefined();

    return essentialCookie;
  }

  /**
   * Get the privacy banner locator
   */
  getPrivacyBanner() {
    return this.page.locator(`#${PRIVACY_BANNER_DIALOG_ID}`);
  }

  /**
   * Assert that privacy banner is visible
   */
  async expectPrivacyBannerVisible(timeout = 20000) {
    const banner = this.getPrivacyBanner();
    await expect(banner).toBeVisible({timeout});
    return banner;
  }

  /**
   * Assert that privacy banner is not visible
   */
  async expectPrivacyBannerNotVisible() {
    const banner = this.getPrivacyBanner();
    await expect(banner).not.toBeVisible();
  }

  /**
   * Wait for consent management GraphQL response
   */
  waitForConsentResponse() {
    return this.page.waitForResponse(async (response) => {
      const url = response.url();
      if (url.includes(GRAPHQL_URL)) {
        const postData = response.request().postData();
        if (postData && postData.includes('consentManagement')) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Accept the privacy banner and wait for consent response
   */
  async acceptPrivacyBanner() {
    const banner = await this.expectPrivacyBannerVisible();
    const responsePromise = this.waitForConsentResponse();

    const acceptButton = this.page.locator(`#${ACCEPT_BUTTON_ID}`);
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();

    await expect(banner).not.toBeVisible();
    const response = await responsePromise;
    expect(response.ok(), 'Consent request should succeed').toBe(true);

    await this.page.waitForLoadState('networkidle');
    return response;
  }

  /**
   * Decline the privacy banner and wait for consent response
   */
  async declinePrivacyBanner() {
    const banner = await this.expectPrivacyBannerVisible();
    const responsePromise = this.waitForConsentResponse();

    const declineButton = this.page.locator(`#${DECLINE_BUTTON_ID}`);
    await expect(declineButton).toBeVisible();
    await declineButton.click();

    await expect(banner).not.toBeVisible();
    const response = await responsePromise;
    expect(response.ok(), 'Consent request should succeed').toBe(true);

    await this.page.waitForLoadState('networkidle');
    return response;
  }

  /**
   * Get the privacy preferences dialog locator
   */
  getPrivacyPreferencesDialog() {
    return this.page.locator(`#${PRIVACY_PREFS_DIALOG_ID}`);
  }

  /**
   * Assert that privacy preferences dialog is visible
   */
  async expectPrivacyPreferencesVisible(timeout = 20000) {
    const dialog = this.getPrivacyPreferencesDialog();
    await expect(dialog).toBeVisible({timeout});
    return dialog;
  }

  /**
   * Open privacy preferences dialog via window.privacyBanner.showPreferences()
   */
  async openPrivacyPreferences() {
    // Wait for the privacy banner API to be available
    await this.page.waitForFunction(
      () => {
        const privacyBanner = (window as any).privacyBanner;
        return privacyBanner?.showPreferences !== undefined;
      },
      {timeout: 10000},
    );

    // Call showPreferences to open the dialog
    await this.page.evaluate(() => {
      const privacyBanner = (window as any).privacyBanner;
      privacyBanner.showPreferences();
    });

    // Wait for the preferences dialog to appear
    await this.expectPrivacyPreferencesVisible();
  }

  /**
   * Accept consent in the privacy preferences dialog
   */
  async acceptInPreferences() {
    const dialog = await this.expectPrivacyPreferencesVisible();
    const responsePromise = this.waitForConsentResponse();

    const acceptButton = this.page.locator(`#${PREFS_ACCEPT_BUTTON_ID}`);
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();

    await expect(dialog).not.toBeVisible();
    const response = await responsePromise;
    expect(response.ok(), 'Consent request should succeed').toBe(true);

    await this.page.waitForLoadState('networkidle');
    return response;
  }

  /**
   * Decline consent in the privacy preferences dialog
   */
  async declineInPreferences() {
    const dialog = await this.expectPrivacyPreferencesVisible();
    const responsePromise = this.waitForConsentResponse();

    const declineButton = this.page.locator(`#${PREFS_DECLINE_BUTTON_ID}`);
    await expect(declineButton).toBeVisible();
    await declineButton.click();

    await expect(dialog).not.toBeVisible();
    const response = await responsePromise;
    expect(response.ok(), 'Consent request should succeed').toBe(true);

    await this.page.waitForLoadState('networkidle');
    return response;
  }

  /**
   * Wait for perf-kit script to be loaded (checks DOM)
   */
  async waitForPerfKit(timeout = 15000) {
    await this.page.waitForFunction(
      () => {
        const perfKitScript = document.querySelector('script[src*="perf-kit"]');
        return perfKitScript !== null;
      },
      {timeout},
    );
  }

  /**
   * Check if perf-kit script has been loaded
   */
  isPerfKitLoaded(): boolean {
    return this.perfKitScriptLoaded;
  }

  /**
   * Assert that perf-kit script has not been loaded
   */
  expectPerfKitNotLoaded() {
    expect(
      this.perfKitScriptLoaded,
      'Perf-kit script should not be loaded',
    ).toBe(false);
  }

  /**
   * Assert that perf-kit script has been loaded
   */
  expectPerfKitLoaded() {
    expect(this.perfKitScriptLoaded, 'Perf-kit script should be loaded').toBe(
      true,
    );
  }

  /**
   * Navigate to the first product on the page
   */
  async navigateToFirstProduct() {
    const productLink = this.page.locator('a[href*="/products/"]').first();
    await expect(productLink).toBeVisible();
    await productLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click the "Add to cart" button and wait for cart drawer with checkout URL
   */
  async addToCart() {
    const addToCartButton = this.page.locator(
      'button:has-text("Add to cart"), button:has-text("Add to Cart")',
    );
    await expect(addToCartButton).toBeVisible({timeout: 10000});
    await addToCartButton.click();

    // Wait for cart drawer to appear
    const cartDrawer = this.page.locator('.overlay.expanded');
    await expect(cartDrawer).toBeVisible({timeout: 5000});

    // Wait for checkout link to appear in the drawer (needs cart mutation response)
    const checkoutLink = this.page.locator(
      '.overlay.expanded a[href*="checkout"], .overlay.expanded a[href*="/cart/c/"]',
    );
    await expect(checkoutLink).toBeVisible({timeout: 10000});

    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get checkout URLs from the page (links containing /cart/c/ or checkout)
   */
  async getCheckoutUrls(): Promise<string[]> {
    // Look for links in the cart drawer that go to checkout
    return this.page.evaluate(() => {
      // First try /cart/c/ pattern (Shopify checkout URLs)
      let links = document.querySelectorAll('a[href*="/cart/c/"]');
      if (links.length === 0) {
        // Fallback: look for any checkout links in the cart drawer
        links = document.querySelectorAll(
          '.overlay.expanded a[href*="checkout"], .overlay.expanded a[href*="/cart/c"]',
        );
      }
      return Array.from(links).map((link) => link.getAttribute('href') || '');
    });
  }

  /**
   * Verify checkout URLs contain tracking params (_y and _s) with expected values
   */
  async verifyCheckoutUrlTrackingParams(
    expectedY: string,
    expectedS: string,
    context: string,
  ) {
    const checkoutUrls = await this.getCheckoutUrls();

    expect(
      checkoutUrls.length,
      `Should have checkout URLs ${context}`,
    ).toBeGreaterThan(0);

    for (const url of checkoutUrls) {
      const urlObj = new URL(url, this.page.url());
      const yParam = urlObj.searchParams.get('_y');
      const sParam = urlObj.searchParams.get('_s');

      expect(yParam, `Checkout URL should have '_y' param ${context}`).toBe(
        expectedY,
      );
      expect(sParam, `Checkout URL should have '_s' param ${context}`).toBe(
        expectedS,
      );
    }

    return checkoutUrls;
  }

  /**
   * Verify checkout URLs do NOT contain real tracking params (_y and _s)
   * Params should either be missing or have mock values (starting with 0000...)
   * Used when consent is declined
   */
  async expectNoCheckoutUrlTrackingParams(context: string) {
    const checkoutUrls = await this.getCheckoutUrls();

    expect(
      checkoutUrls.length,
      `Should have checkout URLs ${context}`,
    ).toBeGreaterThan(0);

    for (const url of checkoutUrls) {
      const urlObj = new URL(url, this.page.url());
      const yParam = urlObj.searchParams.get('_y');
      const sParam = urlObj.searchParams.get('_s');

      // Params should either be null (missing) or mock values
      const yIsValid = yParam === null || MOCK_VALUE_PATTERN.test(yParam);
      const sIsValid = sParam === null || MOCK_VALUE_PATTERN.test(sParam);

      expect(
        yIsValid,
        `Checkout URL '_y' param should be missing or mock value ${context}, got: ${yParam}`,
      ).toBe(true);
      expect(
        sIsValid,
        `Checkout URL '_s' param should be missing or mock value ${context}, got: ${sParam}`,
      ).toBe(true);
    }
  }

  /**
   * Navigate to the cart page
   */
  async navigateToCart() {
    // Close any open overlays/drawers first (like cart drawer)
    const closeButton = this.page.locator(
      'button[aria-label="Close"], .overlay button.close',
    );
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await this.page.waitForTimeout(300);
    }

    // Navigate directly to cart page
    await this.page.goto('/cart');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Reload the page and clear request tracking
   */
  async reload() {
    this.clearRequests();
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clear tracked requests
   */
  clearRequests() {
    this.monorailRequests.length = 0;
    this.perfKitProduceRequests.length = 0;
    this.perfKitScriptLoaded = false;
  }

  /**
   * Assert that no Monorail analytics requests have been made
   */
  expectNoMonorailRequests() {
    expect(
      this.monorailRequests,
      'No Monorail analytics requests should be made',
    ).toHaveLength(0);
  }

  /**
   * Assert that no perf-kit produce requests have been made
   */
  expectNoPerfKitProduceRequests() {
    expect(
      this.perfKitProduceRequests,
      'No perf-kit produce requests should be made',
    ).toHaveLength(0);
  }

  /**
   * Wait for Monorail analytics requests to be made
   */
  async waitForMonorailRequests(minCount = 1) {
    await expect
      .poll(
        () => this.monorailRequests.length,
        'Monorail analytics requests should be made',
      )
      .toBeGreaterThanOrEqual(minCount);
  }

  /**
   * Verify that Monorail batch analytics requests contain the correct tracking values.
   */
  verifyMonorailRequests(
    expectedY: string,
    expectedS: string,
    context: string,
  ) {
    const requestsWithData = this.monorailRequests.filter(
      (req) => req.postData,
    );

    expect(
      requestsWithData.length,
      `Monorail requests with data ${context}`,
    ).toBeGreaterThan(0);

    for (const request of requestsWithData) {
      const payload = JSON.parse(request.postData!) as {
        events?: Array<{payload: MonorailPayload}>;
      };

      expect(
        payload.events,
        `Monorail request payload should be present ${context}`,
      ).toBeDefined();

      for (const event of payload.events!) {
        const eventPayload = event.payload;

        const uniqueToken = eventPayload.unique_token || eventPayload.uniqToken;
        expect(
          uniqueToken,
          `Monorail unique_token ${context} should match _y value`,
        ).toBe(expectedY);

        const visitToken =
          eventPayload.deprecated_visit_token || eventPayload.visitToken;
        expect(
          visitToken,
          `Monorail visit_token ${context} should match _s value`,
        ).toBe(expectedS);
      }
    }
  }

  /**
   * Trigger perf-kit to finalize its metrics by clicking on the page
   * and waiting for metrics to be processed. This finalizes LCP measurement.
   */
  async finalizePerfKitMetrics() {
    // Click on the page body to finalize LCP measurement
    await this.page.click('body');
    // Wait for metrics to be processed
    await this.page.waitForTimeout(100);
  }

  /**
   * Verify that perf-kit produce requests contain the correct tracking values.
   * Also verifies that the request was initiated by the perf-kit script.
   */
  verifyPerfKitRequests(expectedY: string, expectedS: string, context: string) {
    // Filter for requests initiated by perf-kit
    const perfKitRequests = this.perfKitProduceRequests.filter(
      (req) => req.postData && req.initiator?.includes('perf-kit'),
    );

    let foundPerfKitPayload = false;

    for (const request of perfKitRequests) {
      const payload = JSON.parse(request.postData!) as {
        payload?: MonorailPayload;
      };

      foundPerfKitPayload = true;

      // Verify the request was initiated by perf-kit
      expect(
        request.initiator,
        `Request ${context} should be initiated by perf-kit script`,
      ).toContain('perf-kit');

      expect(
        payload.payload?.unique_token,
        `Perf-kit unique_token ${context} should match _y value`,
      ).toBe(expectedY);

      expect(
        payload.payload?.session_token,
        `Perf-kit session_token ${context} should match _s value`,
      ).toBe(expectedS);
    }

    expect(
      foundPerfKitPayload,
      `At least one perf-kit produce request ${context} should be found`,
    ).toBe(true);

    return foundPerfKitPayload;
  }

  /**
   * Assert that server-timing values are mock values (for declined consent)
   */
  expectMockServerTimingValues(values: ServerTimingValues) {
    if (values._y) {
      expect(
        MOCK_VALUE_PATTERN.test(values._y),
        `Server-timing _y should be a mock value, got: ${values._y}`,
      ).toBe(true);
    }
    if (values._s) {
      expect(
        MOCK_VALUE_PATTERN.test(values._s),
        `Server-timing _s should be a mock value, got: ${values._s}`,
      ).toBe(true);
    }
  }

  /**
   * Assert that server-timing values are real UUIDs (not mock values)
   */
  expectRealServerTimingValues(values: ServerTimingValues) {
    expect(values._y, 'Y value should be present').toBeTruthy();
    expect(values._s, 'S value should be present').toBeTruthy();
    // Mock values match MOCK_VALUE_PATTERN: /^0+[-0]*5/ (zeros followed by 5)
    expect(values._y, 'Y value should not be a mock value').not.toMatch(
      MOCK_VALUE_PATTERN,
    );
    expect(values._s, 'S value should not be a mock value').not.toMatch(
      MOCK_VALUE_PATTERN,
    );
  }

  /**
   * Remove specific cookies by name
   */
  async removeCookies(cookieNames: string[]) {
    const cookies = await this.getCookies();
    const baseUrl = new URL(this.page.url());

    for (const name of cookieNames) {
      const cookie = cookies.find((c) => c.name === name);
      if (cookie) {
        await this.context.clearCookies({name, domain: baseUrl.hostname});
      }
    }
  }

  /**
   * Remove HTTP-only analytics cookies (for migration testing)
   */
  async removeHttpOnlyCookies() {
    await this.removeCookies([
      '_shopify_analytics',
      '_shopify_marketing',
      '_shopify_essential',
      '_shopify_essentials',
    ]);
  }

  /**
   * Set the `withPrivacyBanner` value by intercepting the Hydrogen JS bundle.
   * This injects code to directly set the value before Hydrogen's default check.
   * Unlike HTML document interception, this preserves server-timing headers since they come
   * from the document response, not from JS files.
   * @param enable - Whether to enable (true) or disable (false) the privacy banner
   */
  async setWithPrivacyBanner(enable: boolean) {
    // Intercept the Hydrogen development bundle
    await this.page.route('**/@fs/**/hydrogen/dist/**/*.js', async (route) => {
      const response = await route.fetch();
      let body = await response.text();

      // Inject code to set withPrivacyBanner BEFORE the default check:
      // Original: if (consent.withPrivacyBanner === void 0) { ...
      // Modified: consent.withPrivacyBanner = true/false; if (consent.withPrivacyBanner === void 0) { ...
      body = body.replace(
        /if\s*\(consent\.withPrivacyBanner\s*===\s*void 0\)/g,
        `consent.withPrivacyBanner = ${enable}; $&`,
      );

      await route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body,
      });
    });
  }

  /**
   * Apply a discount code via form submission.
   */
  async applyDiscountCode(code: string): Promise<{code: string}> {
    const input = this.page.locator('input[name="discountCode"]:visible');
    const applyButton = input
      .locator('..')
      .getByRole('button', {name: 'Apply discount code'});

    await expect(input).toBeVisible({timeout: 5000});
    await input.fill(code);

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/cart') &&
        response.request().method() === 'POST',
      {timeout: 15000},
    );
    await applyButton.click();
    await responsePromise;

    const upperCode = code.toUpperCase();
    await this.expectDiscountCodeApplied(upperCode);

    return {code: upperCode};
  }

  /**
   * Remove applied discount code.
   */
  async removeDiscountCode(): Promise<void> {
    const removeButton = this.page
      .locator('button[aria-label="Remove discount"]:visible')
      .first();

    await expect(removeButton).toBeVisible({timeout: 5000});

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/cart') &&
        response.request().method() === 'POST',
      {timeout: 15000},
    );
    await removeButton.click();
    await responsePromise;

    await expect(removeButton).not.toBeVisible({timeout: 10000});
  }

  /**
   * Get applied discount codes.
   */
  async getAppliedDiscountCodes(): Promise<string[]> {
    const discountCodeElements = this.page.locator(
      '.cart-discount code:visible',
    );
    const count = await discountCodeElements.count();

    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const codeText = await discountCodeElements.nth(i).textContent();
      if (codeText) {
        codes.push(codeText.trim().toUpperCase());
      }
    }

    return codes;
  }

  /**
   * Try applying discount code (for error testing).
   */
  async tryApplyDiscountCode(code: string): Promise<void> {
    const input = this.page.locator('input[name="discountCode"]:visible');
    const applyButton = input
      .locator('..')
      .getByRole('button', {name: 'Apply discount code'});

    await expect(input).toBeVisible({timeout: 5000});
    await input.fill(code);

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/cart') &&
        response.request().method() === 'POST',
      {timeout: 15000},
    );
    await applyButton.click();
    await responsePromise;
  }

  /**
   * Assert discount code is visible.
   */
  async expectDiscountCodeApplied(
    code: string,
    timeout = 10000,
  ): Promise<void> {
    const upperCode = code.toUpperCase();
    const codeLocator = this.page.locator(
      `.cart-discount code:has-text("${upperCode}"):visible`,
    );
    await expect(codeLocator).toBeVisible({timeout});
  }

  /**
   * Assert discount code is not visible.
   */
  async expectDiscountCodeRemoved(
    code: string,
    timeout = 10000,
  ): Promise<void> {
    const upperCode = code.toUpperCase();
    const codeLocator = this.page.locator(
      `.cart-discount code:has-text("${upperCode}"):visible`,
    );
    await expect(codeLocator).not.toBeVisible({timeout});
  }

  /**
   * Get cart subtotal amount as a number.
   */
  async getCartSubtotal(): Promise<number> {
    const subtotalDd = this.page.locator('.cart-subtotal dd:visible');

    await expect(subtotalDd).toBeVisible({timeout: 5000});
    const subtotalText = await subtotalDd.textContent();

    if (!subtotalText) return 0;

    return parseFloat(subtotalText.replace(/[$,]/g, ''));
  }
}
