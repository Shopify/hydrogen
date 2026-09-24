import type {
  Page,
  BrowserContext,
  Locator,
  Route,
  Response,
} from '@playwright/test';
import {expect} from '@playwright/test';
import assert from './assertions';

// Privacy Banner element IDs
export const PRIVACY_BANNER_DIALOG_ID = 'shopify-pc__banner';
export const ACCEPT_BUTTON_ID = 'shopify-pc__banner__btn-accept';
export const DECLINE_BUTTON_ID = 'shopify-pc__banner__btn-decline';

// Privacy Preferences element IDs
export const PRIVACY_PREFS_DIALOG_ID = 'shopify-pc__prefs__dialog';
export const PREFS_ACCEPT_BUTTON_ID = 'shopify-pc__prefs__header-accept';
export const PREFS_DECLINE_BUTTON_ID = 'shopify-pc__prefs__header-decline';

const CART_ID_PREFIX = 'gid://shopify/Cart/';

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

export interface TrackingTokens {
  uniqueToken: string | null;
  visitToken: string | null;
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
   * Capture the consent token query response before a full navigation or reload.
   * The body is read immediately: Chromium discards it once another
   * navigation replaces the response.
   */
  async withConsentResponse(action: () => Promise<unknown>): Promise<Response> {
    const [response] = await Promise.all([
      this.waitForConsentResponse().then(async (consentResponse) => {
        await consentResponse.body();
        return consentResponse;
      }),
      action(),
    ]);
    return response;
  }

  /**
   * Read the same global token API analytics uses, without generating
   * fallback values: Hydrogen never requests fallback tokens.
   */
  async getTrackingTokens(): Promise<TrackingTokens> {
    await this.page.waitForFunction(
      () =>
        (window as any).Shopify?.customerPrivacy?.consentStatus === 'loaded',
    );
    return this.page.evaluate(() => {
      const privacy = (window as any).Shopify.customerPrivacy;
      return {
        uniqueToken: privacy.__internal.uniqueToken() ?? null,
        visitToken: privacy.__internal.visitToken() ?? null,
      };
    });
  }

  private async getConsentTokens(response: Response): Promise<TrackingTokens> {
    expect(response.ok(), 'Consent request should succeed').toBe(true);
    const body = await response.json();
    expect(
      body.errors,
      'Consent query should have no GraphQL errors',
    ).toBeUndefined();
    const cookies = body.data?.consentManagement?.cookies;
    assert(cookies, 'Consent response should contain cookies');
    expect(cookies).toHaveProperty('shopifyUnique');
    expect(cookies).toHaveProperty('shopifyVisit');
    return {
      uniqueToken: cookies.shopifyUnique,
      visitToken: cookies.shopifyVisit,
    };
  }

  /**
   * Assert an allowed-consent response: real UUID tokens in the body,
   * matching values through the global Customer Privacy API getters,
   * and analytics consent allowed.
   */
  async expectAllowedConsent(response: Response) {
    const {uniqueToken, visitToken} = await this.getConsentTokens(response);
    assert(uniqueToken, 'Consent response should contain a unique token');
    assert(visitToken, 'Consent response should contain a visit token');
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const token of [uniqueToken, visitToken]) {
      expect(token).toMatch(uuid);
      expect(token).not.toMatch(MOCK_VALUE_PATTERN);
    }
    const tokens = {uniqueToken, visitToken};
    await expect
      .poll(
        () => this.getTrackingTokens(),
        'Global getters should match consent response',
      )
      .toEqual(tokens);
    await this.expectAnalyticsAllowed(true);
    return tokens;
  }

  /**
   * Assert a declined-consent response: no tokens in the body, no tokens
   * through the global getters, and analytics consent denied.
   */
  async expectDeclinedConsent(response: Response) {
    const tokens = {uniqueToken: null, visitToken: null};
    expect(
      await this.getConsentTokens(response),
      'Declined consent should return no tokens',
    ).toEqual(tokens);
    await expect
      .poll(
        () => this.getTrackingTokens(),
        'Global getters should expose no tokens',
      )
      .toEqual(tokens);
    await this.expectAnalyticsAllowed(false);
  }

  private async expectAnalyticsAllowed(allowed: boolean) {
    await expect
      .poll(() =>
        this.page.evaluate(() =>
          window.Shopify?.customerPrivacy?.analyticsProcessingAllowed(),
        ),
      )
      .toBe(allowed);
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
    await expect
      .poll(
        async () => {
          const cookies = await this.getCookies();
          return ANALYTICS_COOKIES.filter((cookieName) =>
            cookies.some((c) => c.name.startsWith(cookieName)),
          );
        },
        {
          message: 'Analytics cookies should not be present',
          timeout: 15000,
        },
      )
      .toEqual([]);
  }

  /**
   * Assert that the deprecated JS-visible analytics cookies are never created.
   */
  async expectNoLegacyAnalyticsCookies() {
    await expect
      .poll(
        async () => {
          const cookies = await this.getCookies();
          return ['_shopify_y', '_shopify_s'].filter((cookieName) =>
            cookies.some((c) => c.name === cookieName),
          );
        },
        {
          message: '_shopify_y and _shopify_s cookies should not be present',
          timeout: 15000,
        },
      )
      .toEqual([]);
  }

  /**
   * Assert the modern http-only analytics cookies are present.
   */
  async expectHttpOnlyAnalyticsCookiesPresent() {
    await expect
      .poll(
        async () => {
          const cookies = await this.getCookies();
          return ['_shopify_analytics', '_shopify_marketing'].every((name) =>
            cookies.some((cookie) => cookie.name === name && cookie.httpOnly),
          );
        },
        {
          message:
            'HTTP-only analytics and marketing cookies should be present',
          timeout: 15000,
        },
      )
      .toBe(true);
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
   * Wait for the consent management GraphQL response that returns tracking
   * tokens. Banner configuration requests also use consentManagement, so the
   * query text must identify the token query specifically.
   */
  waitForConsentResponse() {
    return this.page.waitForResponse((response) => {
      const request = response.request();
      if (!response.url().includes(GRAPHQL_URL) || request.method() !== 'POST')
        return false;
      const query = request.postDataJSON()?.query;
      return (
        typeof query === 'string' &&
        /\bconsentManagement\b/.test(query) &&
        /\bshopifyUnique\b/.test(query) &&
        /\bshopifyVisit\b/.test(query)
      );
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

    await response.finished();
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

    await response.finished();
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

    await response.finished();
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

    await response.finished();
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
   * Assert that no perf-kit produce requests have been made
   */
  expectNoPerfKitProduceRequests() {
    const perfKitRequests = this.perfKitProduceRequests.filter((req) =>
      req.initiator?.includes('perf-kit'),
    );

    expect(
      perfKitRequests,
      'No perf-kit produce requests should be made',
    ).toHaveLength(0);
  }

  /**
   * Navigate to an in-stock product by trying product links sequentially.
   * Skips sold-out products (no "Add to cart" button) so that tests only
   * fail when every product on the page is unavailable.
   *
   * With `waitForConsent: true`, each navigation also captures and returns
   * the consent token query response fired during the page load.
   */
  navigateToInStockProduct(options: {waitForConsent: true}): Promise<Response>;
  navigateToInStockProduct(): Promise<void>;
  async navigateToInStockProduct(options?: {
    waitForConsent: true;
  }): Promise<Response | void> {
    // Clicking a product link navigates like page.goto does; the consent
    // fetch fires during the new page load either way.
    const captureConsent = (navigate: () => Promise<unknown>) =>
      options?.waitForConsent
        ? this.withConsentResponse(navigate)
        : navigate().then(() => undefined);

    const listingUrl = this.page.url();
    const productLinks = this.page.locator('a[href*="/products/"]');
    const linkCount = await productLinks.count();
    expect(linkCount, 'At least one product link should exist').toBeGreaterThan(
      0,
    );

    // Cap attempts to avoid slow failure on pages with many products
    const MAX_PRODUCT_ATTEMPTS = 10;
    const attemptsToMake = Math.min(linkCount, MAX_PRODUCT_ATTEMPTS);
    // Shorter timeout than addToCart — just checking button presence, not
    // waiting for a slow action. SSR pages include the button in initial
    // HTML, so 2s is generous. Keeps worst-case (10 sold-out products)
    // under 20s — well within typical Playwright test timeouts.
    const IN_STOCK_CHECK_TIMEOUT_MS = 2000;

    const triedUrls: string[] = [];

    for (let i = 0; i < attemptsToMake; i++) {
      const link = productLinks.nth(i);
      // Fast-path skip: avoids a full navigation + timeout wait for links
      // that aren't actionable (e.g., hidden by CSS or not yet in the DOM).
      if (!(await link.isVisible())) continue;

      const response = await captureConsent(() => link.click());
      triedUrls.push(this.page.url());

      const isInStock = await this.getAddToCartButton()
        .waitFor({state: 'visible', timeout: IN_STOCK_CHECK_TIMEOUT_MS})
        .then(() => true)
        .catch(() => false);

      if (isInStock) return response;

      // Product is sold out — return to listing and try the next one
      await captureConsent(() => this.page.goto(listingUrl));
      await expect(productLinks.first()).toBeVisible();
    }

    throw new Error(
      `No in-stock products found at ${listingUrl} ` +
        `(checked ${attemptsToMake} of ${linkCount} product links). ` +
        `All products appear to be sold out. Tried: ${triedUrls.join(', ')}`,
    );
  }

  private getAddToCartButton() {
    return this.page.getByRole('button', {name: /add to cart/i});
  }

  /**
   * Click the "Add to cart" button and wait for cart drawer with checkout URL
   */
  async addToCart() {
    const addToCartButton = this.getAddToCartButton();
    await expect(addToCartButton).toBeVisible({timeout: 10000});
    await addToCartButton.click();

    // Wait for cart drawer to appear
    const cartDrawer = this.page.locator('.overlay.expanded');
    await expect(cartDrawer).toBeVisible({timeout: 5000});

    // Wait for checkout link to appear in the drawer (proves cart mutation completed)
    const checkoutLink = this.page.locator(
      '.overlay.expanded a[href*="checkout"], .overlay.expanded a[href*="/cart/c/"]',
    );
    await expect(checkoutLink).toBeVisible({timeout: 10000});
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
      // Wait for overlay to actually close rather than magic timeout
      await expect(closeButton).not.toBeVisible({timeout: 5000});
    }

    // Navigate directly to cart page and wait for page content
    await this.page.goto('/cart');
    // Wait for Cart heading to be visible (unambiguous indicator page loaded)
    const cartHeading = this.page.locator('h1:has-text("Cart")');
    await expect(cartHeading).toBeVisible({timeout: 10000});
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

  // ============================================================================
  // Cart Line Item Helpers
  // ============================================================================

  /**
   * Returns all visible cart line items. Uses visibility filter to avoid
   * matching hidden elements in the cart drawer when on the cart page.
   */
  getCartLineItems(): Locator {
    return this.page.locator('li.cart-line:visible');
  }

  /**
   * Returns a specific visible cart line item by index.
   */
  getCartLineItemByIndex(index: number): Locator {
    return this.page.locator('li.cart-line:visible').nth(index);
  }

  /**
   * Returns the cart drawer dialog (uses semantic role selector).
   */
  getCartDrawer(): Locator {
    return this.page.getByRole('dialog');
  }

  /**
   * Returns the visible empty cart message (uses regex to handle curly apostrophe U+2019).
   * Scoped to visible .cart-main to avoid matching hidden drawer content.
   */
  getCartEmptyMessage(): Locator {
    return this.page
      .locator('.cart-main:visible')
      .getByText(/Looks like you haven.t added anything yet/);
  }

  /**
   * Returns the checkout button/link.
   */
  getCheckoutButton(): Locator {
    return this.page.getByRole('link', {name: /Continue to Checkout/i});
  }

  /**
   * Opens the cart aside drawer by clicking the cart badge in the header.
   */
  async openCartAside(): Promise<void> {
    const cartLink = this.page
      .getByRole('banner')
      .getByRole('link', {name: 'Cart'});
    await cartLink.click();
    await expect(this.getCartDrawer()).toBeVisible({timeout: 5000});
  }

  /**
   * Closes the cart aside drawer.
   */
  async closeCartAside(): Promise<void> {
    const closeButton = this.getCartDrawer().getByRole('button', {
      name: 'Close',
    });
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await expect(this.getCartDrawer()).not.toBeVisible();
    }
  }

  /**
   * Gets the cart badge count from the header.
   */
  async getCartBadgeCount(): Promise<number> {
    const cartLink = this.page
      .getByRole('banner')
      .getByRole('link', {name: 'Cart'});
    const text = await cartLink.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Extracts the quantity number from a line item.
   */
  async getLineItemQuantity(lineItem: Locator): Promise<number> {
    const quantityText = await lineItem
      .locator('small')
      .filter({hasText: 'Quantity:'})
      .textContent();
    const match = quantityText?.match(/Quantity:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Increases quantity and waits for the quantity text to actually change.
   * Uses expect.poll to wait for the effect, not just button re-enablement.
   */
  async increaseLineItemQuantity(lineItem: Locator): Promise<void> {
    const currentQuantity = await this.getLineItemQuantity(lineItem);
    const increaseButton = lineItem.getByRole('button', {
      name: 'Increase quantity',
    });

    await expect(increaseButton).toBeEnabled({timeout: 5000});
    await increaseButton.click();

    await expect
      .poll(() => this.getLineItemQuantity(lineItem), {timeout: 10000})
      .toBe(currentQuantity + 1);
  }

  /**
   * Decreases quantity and waits for the quantity text to actually change.
   */
  async decreaseLineItemQuantity(lineItem: Locator): Promise<void> {
    const currentQuantity = await this.getLineItemQuantity(lineItem);
    const decreaseButton = lineItem.getByRole('button', {
      name: 'Decrease quantity',
    });

    await expect(decreaseButton).toBeEnabled({timeout: 5000});
    await decreaseButton.click();

    await expect
      .poll(() => this.getLineItemQuantity(lineItem), {timeout: 10000})
      .toBe(currentQuantity - 1);
  }

  /**
   * Removes a line item and waits for it to disappear.
   */
  async removeLineItem(lineItem: Locator): Promise<void> {
    const removeButton = lineItem.getByRole('button', {name: 'Remove'});
    await expect(removeButton).toBeEnabled({timeout: 5000});
    await removeButton.click();
    await expect(lineItem).not.toBeVisible({timeout: 10000});
  }

  /**
   * Extracts subtotal as a number (removes currency formatting).
   * Handles multiple currency formats like "$1,234.56" or "1.234,56 €".
   * Uses :visible to match only the current context (drawer or page).
   */
  async getSubtotalAmount(): Promise<number> {
    const subtotalElement = this.page.locator('.cart-subtotal:visible dd');
    const text = await subtotalElement.textContent();
    if (!text) return 0;

    // For US format ($1,234.56): remove commas, keep decimal point
    // For EU format (1.234,56 €): swap comma/dot
    const cleaned = text.replace(/[^\d.,]/g, '');
    // Detect format: if last separator is comma, it's EU format
    const lastCommaIndex = cleaned.lastIndexOf(',');
    const lastDotIndex = cleaned.lastIndexOf('.');

    let numericString: string;
    if (lastCommaIndex > lastDotIndex) {
      // EU format: 1.234,56 -> 1234.56
      numericString = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56 -> 1234.56
      numericString = cleaned.replace(/,/g, '');
    }

    return parseFloat(numericString) || 0;
  }

  /**
   * Clears all cookies to reset cart and session state.
   * Cart state is stored in a cookie, so clearing cookies resets the cart.
   */
  async clearAllCookies(): Promise<void> {
    await this.context.clearCookies();
  }

  /**
   * Set the `withPrivacyBanner` value by intercepting the Hydrogen JS bundle.
   * This injects code to directly set the value before Hydrogen's default check.
   * Unlike HTML document interception, this preserves server-timing headers since they come
   * from the document response, not from JS files.
   * @param enable - Whether to enable (true) or disable (false) the privacy banner
   */
  async setWithPrivacyBanner(enable: boolean) {
    const injectConsentFlag = async (route: Route) => {
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
    };

    // Intercept the Hydrogen bundle in BOTH Vite serving modes:
    // 1. Direct filesystem serving (monorepo — hydrogen not in optimizeDeps)
    await this.page.route('**/@fs/**/hydrogen/dist/**/*.js', injectConsentFlag);
    // 2. Vite pre-bundled deps (production-like — hydrogen in optimizeDeps).
    //    Trailing * after .js matches Vite's cache-busting query strings (?v=abc123).
    await this.page.route(
      '**/.vite/deps/@shopify_hydrogen*.js*',
      injectConsentFlag,
    );
  }

  async getCartId() {
    const cartId = await this.getCookie('cart');
    return cartId?.value
      ? `${CART_ID_PREFIX}${decodeURIComponent(cartId.value)}`
      : undefined;
  }

  async setCartId(cartId: string) {
    if (cartId.startsWith(CART_ID_PREFIX)) {
      cartId = cartId.replace(CART_ID_PREFIX, '');
    }
    await this.context.addCookies([
      {
        name: 'cart',
        value: encodeURIComponent(cartId),
        url: this.page.url(),
        httpOnly: false,
        secure: false,
      },
    ]);
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

  // ─────────────────────────────────────────────────
  // Gift Card Helper Methods
  // ─────────────────────────────────────────────────

  /**
   * Apply a gift card code to the cart.
   * Uses 3-phase waiting to prevent race conditions:
   * 1. Wait for the specific cart API response (not just networkidle)
   * 2. Wait for input to clear (indicates response arrived)
   * 3. Wait for the card to appear in applied list
   *
   * @returns The last 4 characters (uppercase) and amount applied
   */
  async applyGiftCard(
    code: string,
  ): Promise<{lastChars: string; amount: string}> {
    // Use :visible filter to target only the visible input (cart page, not drawer)
    const input = this.page.locator('input[name="giftCardCode"]:visible');
    const applyButton = this.page.locator(
      'input[name="giftCardCode"]:visible ~ button[type="submit"]',
    );

    await expect(input).toBeVisible({timeout: 5000});
    await input.fill(code);

    // Phase 1: Wait for the specific cart API response (more reliable than networkidle)
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/cart') &&
        response.request().method() === 'POST',
      {timeout: 15000},
    );
    await applyButton.click();
    await responsePromise;

    // Phase 2: Wait for input to clear (indicates fetcher.data arrived and component re-rendered)
    await expect(input).toHaveValue('', {timeout: 10000});

    // Phase 3: Wait for the card to appear in applied list
    const lastChars = code.slice(-4).toUpperCase();
    await this.expectGiftCardApplied(lastChars);

    // Get the amount for the newly applied card
    const amount = await this.getAppliedCardAmount(lastChars);

    return {lastChars, amount};
  }

  /**
   * Remove a specific gift card by its last 4 characters.
   * Waits for removal confirmation before returning.
   */
  async removeGiftCard(lastCharacters: string): Promise<void> {
    const upperLastChars = lastCharacters.toUpperCase();
    const cardLocator = this.page.locator(
      `code:has-text("***${upperLastChars}"):visible`,
    );

    await expect(cardLocator).toBeVisible({timeout: 5000});

    // Find the Remove button within the same parent form
    const removeButton = cardLocator
      .locator('xpath=ancestor::form')
      .locator('button:has-text("Remove")');

    // Ensure button is visible and clickable before clicking
    await expect(removeButton).toBeVisible({timeout: 5000});

    // Wait for the specific cart API response
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/cart') &&
        response.request().method() === 'POST',
      {timeout: 15000},
    );
    await removeButton.click();
    await responsePromise;

    // Wait for card to disappear
    await this.expectGiftCardRemoved(upperLastChars);
  }

  /**
   * Remove all applied gift cards from the cart.
   */
  async removeAllGiftCards(): Promise<void> {
    const cards = await this.getAppliedGiftCards();

    for (const card of cards) {
      await this.removeGiftCard(card.lastChars);
    }
  }

  /**
   * Get list of all currently applied gift cards.
   */
  async getAppliedGiftCards(): Promise<
    Array<{lastChars: string; amount: string}>
  > {
    // Use has-text with the *** prefix and :visible to avoid drawer duplicates
    const cardLocators = this.page.locator('code:has-text("***"):visible');
    const count = await cardLocators.count();

    const cards: Array<{lastChars: string; amount: string}> = [];

    for (let i = 0; i < count; i++) {
      const codeText = await cardLocators.nth(i).textContent();
      if (!codeText) continue;

      // Normalize to uppercase to match applyGiftCard() convention
      const lastChars = codeText.replace('***', '').toUpperCase();
      const amount = await this.getAppliedCardAmount(lastChars);
      cards.push({lastChars, amount});
    }

    return cards;
  }

  /**
   * Get the amount for a specific applied gift card.
   * The DOM structure has the amount as a sibling of the code element within the same parent.
   */
  private async getAppliedCardAmount(lastCharacters: string): Promise<string> {
    const upperLastChars = lastCharacters.toUpperCase();
    const codeElement = this.page.locator(
      `code:has-text("***${upperLastChars}"):visible`,
    );

    // Get the parent container that holds both code and amount
    const parent = codeElement.locator('xpath=..');

    // The amount is a sibling element containing a dollar sign (not the code or button)
    // Look for any element with text matching a money pattern like "$10.00"
    const amountElement = parent.locator(':scope > *').filter({
      hasText: /^\$[\d,.]+$/,
    });

    await expect(amountElement).toBeAttached({timeout: 5000});
    const amountText = await amountElement.textContent();
    return amountText?.trim() || '';
  }

  /**
   * Fill and submit a gift card code without waiting for success.
   * Use for testing error scenarios (invalid codes, duplicates, etc.)
   * where the standard applyGiftCard() waiting pattern doesn't apply.
   */
  async tryApplyGiftCardCode(code: string): Promise<void> {
    // Use :visible filter to target only the visible input (cart page, not drawer)
    const input = this.page.locator('input[name="giftCardCode"]:visible');
    const applyButton = this.page.locator(
      'input[name="giftCardCode"]:visible ~ button[type="submit"]',
    );

    await expect(input).toBeVisible({timeout: 5000});
    await input.fill(code);

    // Wait for the cart API response (may be success or error)
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
   * Assert that a gift card is visible in the applied cards list.
   */
  async expectGiftCardApplied(
    lastCharacters: string,
    timeout = 10000,
  ): Promise<void> {
    const upperLastChars = lastCharacters.toUpperCase();
    const cardLocator = this.page.locator(
      `code:has-text("***${upperLastChars}"):visible`,
    );
    await expect(cardLocator).toBeVisible({timeout});
  }

  /**
   * Assert that a gift card is NOT visible in the applied cards list.
   */
  async expectGiftCardRemoved(
    lastCharacters: string,
    timeout = 10000,
  ): Promise<void> {
    const upperLastChars = lastCharacters.toUpperCase();
    const cardLocator = this.page.locator(
      `code:has-text("***${upperLastChars}"):visible`,
    );
    await expect(cardLocator).not.toBeVisible({timeout});
  }

  /**
   * Assert that a gift card error message is displayed.
   * Polls for error visibility to handle various error UI implementations (toast, alert, inline).
   */
  async expectGiftCardError(
    expectedPattern: RegExp,
    timeout = 10000,
  ): Promise<void> {
    // Look for common error patterns: [role="alert"], .error, aria-invalid, etc.
    const errorSelectors = [
      '[role="alert"]',
      '[aria-live="polite"]',
      '[aria-live="assertive"]',
      '.error',
      '.gift-card-error',
      'form:has(input[name="giftCardCode"]) .error-message',
    ];

    await expect
      .poll(
        async () => {
          for (const selector of errorSelectors) {
            const element = this.page.locator(selector);
            if (await element.isVisible().catch(() => false)) {
              const text = await element.textContent();
              if (text && expectedPattern.test(text)) {
                return true;
              }
            }
          }
          return false;
        },
        {
          message: `Expected gift card error matching ${expectedPattern}`,
          timeout,
        },
      )
      .toBe(true);
  }

  // ─────────────────────────────────────────────────
  // Checkout Navigation Methods
  // ─────────────────────────────────────────────────

  /**
   * Click the checkout button and wait for navigation to the Shopify checkout page.
   * Returns the checkout page for further assertions.
   */
  async navigateToCheckout(): Promise<void> {
    const checkoutLink = this.page.locator(
      'a[href*="/cart/c/"]:visible, a:has-text("Checkout"):visible',
    );
    await expect(checkoutLink).toBeVisible({timeout: 10000});

    // Click and wait for navigation to checkout domain
    await Promise.all([
      this.page.waitForURL(/checkout/, {timeout: 30000}),
      checkoutLink.first().click(),
    ]);

    // Wait for checkout page to load
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Verify that applied gift cards appear on the Shopify checkout page.
   * Searches for gift card entries in the order summary section.
   *
   * @param expectedLastChars - Array of last 4 characters of gift card codes to verify
   */
  async expectGiftCardsInCheckout(expectedLastChars: string[]): Promise<void> {
    for (const lastChars of expectedLastChars) {
      const upperLastChars = lastChars.toUpperCase();

      // Shopify checkout shows gift cards in various formats:
      // - "Gift card ending in XXXX"
      // - "•••• XXXX"
      // - Just the last 4 digits in a discount section
      const giftCardLocator = this.page.locator(`text=/${upperLastChars}/i`);

      await expect(
        giftCardLocator.first(),
        `Gift card ending in ${upperLastChars} should appear in checkout`,
      ).toBeVisible({timeout: 15000});
    }
  }
}
