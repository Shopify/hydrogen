import {test, expect, setRecipeFixture} from '../../fixtures';

setRecipeFixture({
  recipeName: 'markets',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Markets recipe, which provides URL-based localization via path
 * prefixes (e.g. /FR-CA/). Tests cover routing, API-driven currency formatting,
 * and the country selector UI.
 *
 * NOTE: The recipe doesn't include a UI string translation system — hardcoded
 * text like "Add to cart" stays in English. Localization is routing- and
 * API-driven, not client-side string substitution.
 */

const LOCALES = {
  default: {
    path: '/',
    currencyFormat: /^\$[\d,]+\.\d{2}$/,
  },
  frCA: {
    path: '/FR-CA',
    currencyFormat: /^CA\$[\d,]+\.\d{2}$/,
  },
} as const;

test.describe('Markets Recipe', () => {
  test('default locale has no URL prefix and shows USD prices', async ({
    page,
    storefront,
  }) => {
    await storefront.goto(LOCALES.default.path);

    expect(new URL(page.url()).pathname).toMatch(/^\/(\?.*)?$/);
    expect(page.url()).not.toContain('/EN-US');

    await storefront.navigateToFirstProduct();

    expect(page.url()).toMatch(/\/products\/.+/);
    expect(page.url()).not.toContain('/EN-US/');

    const priceElement = page
      .locator('div')
      .filter({hasText: LOCALES.default.currencyFormat})
      .first();
    await expect(priceElement).toBeVisible();
  });

  test('FR-CA home page navigation links include locale prefix', async ({
    page,
    storefront,
  }) => {
    await storefront.goto(LOCALES.frCA.path);

    expect(page.url()).toContain('/FR-CA');

    const navigation = page.getByRole('navigation').first();
    await expect(navigation).toBeVisible();

    const navLinks = navigation.getByRole('link');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(linkCount, 3); i++) {
      const href = await navLinks.nth(i).getAttribute('href');
      if (href?.startsWith('/') && !href.startsWith('//')) {
        expect(href).toMatch(/^\/FR-CA\//);
      }
    }
  });

  test.describe('FR-CA product flow', () => {
    test.beforeEach(async ({page, storefront}) => {
      await storefront.goto(LOCALES.frCA.path);
      const firstProductLink = page.locator('a[href*="/products/"]').first();
      await expect(firstProductLink).toBeVisible({timeout: 10000});
      await Promise.all([
        page.waitForURL(/\/FR-CA\/products\/.+/),
        firstProductLink.click(),
      ]);
    });

    test('product page shows CAD prices', async ({page}) => {
      const priceElement = page
        .locator('div')
        .filter({hasText: LOCALES.frCA.currencyFormat})
        .first();
      await expect(priceElement).toBeVisible();
    });

    test('locale prefix persists through cart flow and cart shows CAD prices', async ({
      page,
      storefront,
    }) => {
      await storefront.addToCart();

      // CAD in the drawer proves AddToCartButton posted to /FR-CA/cart rather than /cart,
      // creating the cart with the correct market context.
      const cartDrawer = storefront.getCartDrawer();
      await expect(cartDrawer).toBeVisible();
      const drawerSubtotal = cartDrawer
        .getByRole('definition')
        .getByText(/CA\$/);
      await expect(drawerSubtotal).toBeVisible();

      await storefront.navigateToCart();

      expect(page.url()).toMatch(/\/FR-CA\/cart$/);

      const cartHeading = page.getByRole('heading', {name: /cart/i, level: 1});
      await expect(cartHeading).toBeVisible();

      const subtotal = page.getByRole('definition').getByText(/CA\$/);
      await expect(subtotal).toBeVisible();
      const subtotalText = await subtotal.textContent();
      expect(subtotalText?.trim()).toMatch(LOCALES.frCA.currencyFormat);
    });
  });

  test('collection page URL includes locale prefix and products link with locale', async ({
    page,
    storefront,
  }) => {
    await storefront.goto(LOCALES.frCA.path + '/collections/all');

    expect(page.url()).toContain('/FR-CA/collections/all');

    const productLinks = page.locator('a[href*="/products/"]');
    await expect(productLinks.first()).toBeVisible({timeout: 5000});

    const href = await productLinks.first().getAttribute('href');
    expect(href).toMatch(/^\/FR-CA\/products\/.+/);
  });

  test('country selector displays current locale and switches locale on selection', async ({
    page,
    storefront,
  }) => {
    await storefront.goto(LOCALES.frCA.path);

    const countrySelector = page.locator(
      'details[aria-label="Country selector"]',
    );
    await expect(countrySelector).toBeVisible();

    const currentLocaleSummary = countrySelector.locator(
      'summary[aria-label*="Current locale"]',
    );
    await expect(currentLocaleSummary).toBeVisible();
    expect(await currentLocaleSummary.textContent()).toContain('FR-CA');

    await currentLocaleSummary.click();

    const switchButton = page.getByRole('button', {name: /Switch to/i}).first();
    await expect(switchButton).toBeVisible();

    // Clicking a switch button triggers a cart buyer identity update and
    // redirects to the selected locale's root — verify the redirect happens.
    await switchButton.click();
    await page.waitForURL(/\/[A-Z]{2}-[A-Z]{2}(\/|$)|\/$/, {timeout: 10000});
  });
});
