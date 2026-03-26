import {expect, Locator, Page} from '@playwright/test';
import {CartUtil} from './cart-utils';

const LOCALE_SWITCH_NAVIGATION_TIMEOUT_IN_MS = 10_000;

/**
 * Markets-specific test utilities for the Markets recipe.
 * Provides helpers for locale navigation, currency assertions, and country selector.
 */
export class MarketsUtil {
  constructor(private page: Page) {}

  async assertLocaleInUrl(localePrefix: string) {
    const pathname = new URL(this.page.url()).pathname;
    expect(pathname.toLowerCase()).toMatch(
      new RegExp(`^${localePrefix.toLowerCase()}(/|$)`),
    );
  }

  async assertNoLocalePrefix() {
    const pathname = new URL(this.page.url()).pathname;
    // Checks that the path doesn't start with a locale prefix (e.g., /FR-CA/)
    expect(pathname).not.toMatch(/^\/[A-Z]{2}-[A-Z]{2}(\/|$)/i);
  }

  async assertPriceFormat(priceLocator: Locator, expectedFormat: RegExp) {
    await expect(priceLocator).toBeVisible();
    await expect(priceLocator).toHaveText(expectedFormat);
  }

  async assertNavigationLinksHaveLocalePrefix(localePrefix: string) {
    const navigation = this.page.getByRole('navigation').first();
    await expect(navigation).toBeVisible();

    const navLinks = navigation.getByRole('link');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(linkCount, 3); i++) {
      const href = await navLinks.nth(i).getAttribute('href');
      if (href?.startsWith('/') && !href.startsWith('//')) {
        expect(href).toMatch(new RegExp(`^${localePrefix}/`));
      }
    }
  }

  async navigateToProduct(productHandle: string, localePrefix = '') {
    const path = localePrefix
      ? `${localePrefix}/products/${productHandle}`
      : `/products/${productHandle}`;
    await this.page.goto(path);
    await expect(this.page).toHaveURL(new RegExp(`/products/${productHandle}`));
  }

  async clickProductLink(productName: string, expectedLocalePrefix?: string) {
    const productLink = this.page.getByRole('link', {name: productName});
    await expect(productLink).toBeVisible();
    const urlPattern = expectedLocalePrefix
      ? new RegExp(`${expectedLocalePrefix}/products/.+`)
      : /\/products\/.+/;
    await Promise.all([this.page.waitForURL(urlPattern), productLink.click()]);
  }

  getPriceElement() {
    return this.page.getByRole('group', {name: 'Price'}).first();
  }

  getCountrySelector() {
    return this.page.getByRole('group', {name: 'Country selector'});
  }

  async assertCountrySelectorVisible() {
    const selector = this.getCountrySelector();
    await expect(selector).toBeVisible();
  }

  async assertCurrentLocaleInSelector(locale: string) {
    const currentLocaleSummary = this.getCountrySelector().locator(
      'summary[aria-label*="Current locale"]',
    );
    await expect(currentLocaleSummary).toBeVisible();
    await expect(currentLocaleSummary).toContainText(locale);
  }

  async switchToFirstAvailableLocale(currentLocalePrefix: string) {
    const summary = this.getCountrySelector().locator('summary');
    await summary.click();

    const switchButtons = this.page.getByRole('button', {name: /Switch to/i});
    const buttonCount = await switchButtons.count();

    let targetLocale: string | undefined;
    let targetButton;

    for (let i = 0; i < buttonCount; i++) {
      const button = switchButtons.nth(i);
      const buttonText = (await button.textContent())?.trim() ?? '';
      const locale = buttonText.replace(/^Switch to\s+/i, '');

      if (locale.toUpperCase() !== currentLocalePrefix.toUpperCase()) {
        targetLocale = locale;
        targetButton = button;
        break;
      }
    }

    if (!targetButton || !targetLocale) {
      throw new Error(
        `No locale switch button found targeting a locale other than ${currentLocalePrefix}`,
      );
    }

    await targetButton.click();
    // The |\/$  branch handles switching to the default locale (e.g. EN-US)
    // where the pathPrefix is '/' — the URL will end with just a trailing slash.
    await this.page.waitForURL(/\/[A-Z]{2}-[A-Z]{2}(\/|$)|\/$/, {
      timeout: LOCALE_SWITCH_NAVIGATION_TIMEOUT_IN_MS,
    });

    await this.assertCurrentLocaleInSelector(targetLocale);
  }

  async assertCollectionLinksHaveLocalePrefix(localePrefix: string) {
    const productLinks = this.page.locator('a[href*="/products/"]');
    await expect(productLinks.first()).toBeVisible();

    const href = await productLinks.first().getAttribute('href');
    expect(href).toMatch(new RegExp(`^${localePrefix}/products/.+`));
  }

  async assertCartSubtotalFormat(currencyFormat: RegExp) {
    await new CartUtil(this.page).assertSubtotalCurrencyFormat(currencyFormat);
  }
}
