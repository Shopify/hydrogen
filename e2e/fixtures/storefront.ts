import type {Page, BrowserContext} from '@playwright/test';
import {expect} from '@playwright/test';

// Privacy Banner element IDs
export const PRIVACY_BANNER_DIALOG_ID = 'shopify-pc__banner';
export const ACCEPT_BUTTON_ID = 'shopify-pc__banner__btn-accept';
export const DECLINE_BUTTON_ID = 'shopify-pc__banner__btn-decline';

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
export const MONORAIL_PRODUCE_URL = '/v1/produce'; // Perf-kit endpoint (note: /v1/produce won't match /produce_batch)
export const GRAPHQL_URL = 'graphql.json';

// Mock value pattern for declined consent (all zeros with a 5)
export const MOCK_VALUE_PATTERN = /^0+[-0]*5/;

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
  readonly analyticsRequests: AnalyticsRequest[] = [];
  readonly perfKitRequests: string[] = [];
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
      // Track /produce_batch (Shopify Analytics) and /v1/produce (Perf-kit)
      if (
        url.includes(MONORAIL_BATCH_URL) ||
        url.includes(MONORAIL_PRODUCE_URL)
      ) {
        this.analyticsRequests.push({
          url,
          postData: request.postData() || undefined,
          initiator: this.requestInitiators.get(url),
        });
      }
      if (url.includes(PERF_KIT_URL)) {
        this.perfKitRequests.push(url);
      }
    });
  }

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
  async expectPrivacyBannerVisible(timeout = 10000) {
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
   * Wait for perf-kit script to be loaded
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
   * Verify checkout URLs contain tracking params (y and s) with expected values
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
      const yParam = urlObj.searchParams.get('y');
      const sParam = urlObj.searchParams.get('s');

      expect(yParam, `Checkout URL should have 'y' param ${context}`).toBe(
        expectedY,
      );
      expect(sParam, `Checkout URL should have 's' param ${context}`).toBe(
        expectedS,
      );
    }

    return checkoutUrls;
  }

  /**
   * Verify checkout URLs do NOT contain tracking params (y and s)
   * Used when consent is declined
   */
  async expectNoCheckoutUrlTrackingParams(context: string) {
    const checkoutUrls = await this.getCheckoutUrls();

    expect(
      checkoutUrls.length,
      `Should have checkout URLs ${context}`,
    ).toBeGreaterThan(0);

    // It's okay if there are no checkout URLs
    for (const url of checkoutUrls) {
      const urlObj = new URL(url, this.page.url());
      const yParam = urlObj.searchParams.get('y');
      const sParam = urlObj.searchParams.get('s');

      expect(
        yParam,
        `Checkout URL should NOT have 'y' param ${context}`,
      ).toBeNull();
      expect(
        sParam,
        `Checkout URL should NOT have 's' param ${context}`,
      ).toBeNull();
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
   * Clear tracked analytics and perf-kit requests
   */
  clearRequests() {
    this.analyticsRequests.length = 0;
    this.perfKitRequests.length = 0;
  }

  /**
   * Assert that no analytics requests have been made
   */
  expectNoAnalyticsRequests() {
    expect(
      this.analyticsRequests,
      'No analytics requests should be made',
    ).toHaveLength(0);
  }

  /**
   * Assert that no perf-kit requests have been made
   */
  expectNoPerfKitRequests() {
    expect(
      this.perfKitRequests,
      'No perf-kit requests should be made',
    ).toHaveLength(0);
  }

  /**
   * Wait for analytics requests to be made
   */
  async waitForAnalyticsRequests(minCount = 1) {
    await expect
      .poll(
        () => this.analyticsRequests.length,
        'Analytics requests should be made',
      )
      .toBeGreaterThanOrEqual(minCount);
  }

  /**
   * Verify that Monorail batch analytics requests contain the correct tracking values.
   * These are requests to /produce_batch (Shopify Analytics), not /v1/produce (Perf-kit).
   */
  verifyMonorailRequests(
    expectedY: string,
    expectedS: string,
    context: string,
  ) {
    // Filter for batch requests only (not perf-kit /v1/produce requests)
    const batchRequests = this.analyticsRequests.filter(
      (req) => req.url.includes(MONORAIL_BATCH_URL) && req.postData,
    );

    for (const request of batchRequests) {
      const payload = JSON.parse(request.postData!) as {
        events?: Array<{payload: MonorailPayload}>;
      };

      if (payload.events) {
        for (const event of payload.events) {
          const eventPayload = event.payload;

          const uniqueToken =
            eventPayload.unique_token || eventPayload.uniqToken;
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
   * Verify that perf-kit Monorail requests contain the correct tracking values.
   * Perf-kit sends to /v1/produce (not /produce_batch) with unique_token and session_token.
   * Also verifies that the request was initiated by the perf-kit script.
   */
  verifyPerfKitRequests(expectedY: string, expectedS: string, context: string) {
    // Filter for perf-kit specific requests:
    // 1. URL contains /v1/produce but not /produce_batch
    // 2. Has post data
    // 3. Initiated by perf-kit script (if CDP tracking is available)
    const perfKitProduceRequests = this.analyticsRequests.filter(
      (req) =>
        req.url.includes(MONORAIL_PRODUCE_URL) &&
        !req.url.includes(MONORAIL_BATCH_URL) &&
        req.postData &&
        // Verify initiator is perf-kit (if available)
        req.initiator?.includes('perf-kit'),
    );

    let foundPerfKitPayload = false;

    for (const request of perfKitProduceRequests) {
      const payload = JSON.parse(request.postData!) as {
        payload?: MonorailPayload;
      };

      // Perf-kit sends unique_token and session_token in the payload
      foundPerfKitPayload = true;

      // Verify the request was initiated by perf-kit if initiator is available
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
      `At least one perf-kit Monorail request ${context} should be found`,
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
    expect(values._y, 'Y value should be a real UUID').not.toMatch(/^0+[-0]/);
    expect(values._s, 'S value should be a real UUID').not.toMatch(/^0+[-0]/);
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
   * Mock consent response to simulate different consent regions
   * @param consentType - 'allowed' for consent allowed by default, 'required' for consent required
   * @returns A function to stop mocking
   */
  async mockConsentResponse(consentType: 'allowed' | 'required') {
    const handler = async (route: any) => {
      const request = route.request();
      const postData = request.postData();

      if (postData && postData.includes('consentManagement')) {
        // Return mock response based on consent type
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              consentManagement: {
                region: consentType === 'allowed' ? 'US' : 'EU',
                consentRequired: consentType === 'required',
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    };

    await this.page.route(`**/${GRAPHQL_URL}`, handler);

    return async () => {
      await this.page.unroute(`**/${GRAPHQL_URL}`, handler);
    };
  }
}
