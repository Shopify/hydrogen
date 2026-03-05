import {expect, Locator, Page} from '@playwright/test';

/**
 * Markets-specific test utilities for the Markets recipe.
 * Provides helpers for locale navigation, currency assertions, and country selector.
 */
export class MarketsUtil {
  constructor(private page: Page) {}

  async navigateToLocale(localePath: string) {
    await this.page.goto(localePath);
    await expect(this.page).toHaveURL(new RegExp(localePath));
  }

  async assertLocaleInUrl(localePrefix: string) {
    const url = this.page.url();
    expect(url).toContain(localePrefix);
  }

  async assertNoLocalePrefix() {
    const pathname = new URL(this.page.url()).pathname;
    expect(pathname).toBe('/');
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
    return this.page.locator('details[aria-label="Country selector"]');
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

  async openCountrySelector() {
    const summary = this.getCountrySelector().locator('summary');
    await summary.click();
  }

  async switchToFirstAvailableLocale() {
    await this.openCountrySelector();
    const switchButton = this.page
      .getByRole('button', {name: /Switch to/i})
      .first();
    await expect(switchButton).toBeVisible();
    await switchButton.click();
    // Wait for navigation to a locale-prefixed URL (e.g., /FR-CA) or root (/)
    await this.page.waitForURL(/\/[A-Z]{2}-[A-Z]{2}(\/|$)|\/$/, {
      timeout: 10000,
    });
  }

  async assertCollectionLinksHaveLocalePrefix(localePrefix: string) {
    const productLinks = this.page.locator('a[href*="/products/"]');
    await expect(productLinks.first()).toBeVisible();

    const href = await productLinks.first().getAttribute('href');
    expect(href).toMatch(new RegExp(`^${localePrefix}/products/.+`));
  }

  async assertCartSubtotalFormat(currencyFormat: RegExp) {
    const cartDrawer = this.page.getByRole('dialog', {name: /cart/i});
    await expect(cartDrawer).toBeVisible();

    // Wait for cart to load (remove button enabled means data is ready)
    const removeButton = cartDrawer.getByRole('button', {name: 'Remove'});
    await expect(removeButton).toBeEnabled();

    const drawerSubtotal = cartDrawer
      .getByRole('definition')
      .filter({hasText: currencyFormat});
    await expect(drawerSubtotal).toBeVisible();
  }

  async assertCartPageSubtotalFormat(currencyFormat: RegExp) {
    const cartHeading = this.page.getByRole('heading', {
      name: /cart/i,
      level: 1,
    });
    await expect(cartHeading).toBeVisible();

    const subtotal = this.page
      .getByRole('definition')
      .filter({hasText: currencyFormat});
    await expect(subtotal).toBeVisible();
    await expect(subtotal).toHaveText(currencyFormat);
  }
}
