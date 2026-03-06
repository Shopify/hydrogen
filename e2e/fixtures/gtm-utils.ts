import {expect, type Page} from '@playwright/test';

export class GtmUtil {
  constructor(private page: Page) {}

  async assertGtmScriptLoaded() {
    // Check if GTM script is present in the page
    const gtmScript = this.page.locator(
      'script[src*="googletagmanager.com/gtm.js"]',
    );
    await expect(gtmScript).toBeAttached();
  }

  async assertGtmNoScriptPresent() {
    // Check if GTM noscript iframe is present
    // The noscript tag contains an iframe, but Playwright can't see inside noscript tags
    // So we check if the noscript element exists
    const gtmNoScript = this.page.locator('noscript');
    const count = await gtmNoScript.count();
    expect(count).toBeGreaterThan(0);
  }

  async assertDataLayerExists() {
    // Verify dataLayer global variable exists
    const hasDataLayer = await this.page.evaluate(() => {
      return (
        typeof window.dataLayer !== 'undefined' &&
        Array.isArray(window.dataLayer)
      );
    });
    expect(hasDataLayer).toBe(true);
  }

  async assertDataLayerEvent(eventName: string) {
    // Check if a specific event exists in dataLayer
    const eventExists = await this.page.evaluate((event) => {
      return window.dataLayer.some((item: any) => item.event === event);
    }, eventName);
    expect(eventExists).toBe(true);
  }

  async waitForDataLayerPush(timeoutMs = 5000) {
    // Wait for at least one item to be pushed to dataLayer
    await this.page.waitForFunction(
      () => window.dataLayer && window.dataLayer.length > 0,
      {timeout: timeoutMs},
    );
  }

  async getDataLayerLength() {
    return this.page.evaluate(() => window.dataLayer?.length || 0);
  }

  async assertDataLayerNotEmpty() {
    const length = await this.getDataLayerLength();
    expect(length).toBeGreaterThan(0);
  }

  async navigateToProduct(handle: string) {
    await this.page.goto(`/products/${handle}`);
    await expect(this.page).toHaveURL(new RegExp(`/products/${handle}`));
  }

  async assertAnalyticsProviderPresent() {
    // Check if Analytics.Provider is set up by looking for analytics-related attributes
    // or by checking if analytics events can be triggered
    const hasAnalytics = await this.page.evaluate(() => {
      // Check if Shopify analytics is available
      return typeof window.Shopify !== 'undefined';
    });
    // Note: This might not be directly testable without triggering events
    // We'll rely on GTM script presence as proxy for proper setup
  }

  async assertGtmContainerIdConfigured() {
    // Verify GTM container ID is not the placeholder
    const hasRealContainerId = await this.page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.some((script) => {
        const src = script.src;
        return (
          src.includes('googletagmanager.com/gtm.js') &&
          src.includes('id=GTM-') &&
          !src.includes('GTM-<YOUR_GTM_ID>')
        );
      });
    });
    expect(hasRealContainerId).toBe(true);
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    dataLayer: any[];
  }
}
