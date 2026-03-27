import {test, expect, setRecipeFixture} from '../../fixtures';
import {MarketsUtil} from '../../fixtures/markets-utils';
import {CartUtil} from '../../fixtures/cart-utils';
import {CURRENCY_FORMATS} from '../../fixtures/currency-formats';
import {KNOWN_SKELETON_PRODUCT} from '../../fixtures/known-products';

setRecipeFixture({
  recipeName: 'markets',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Markets Recipe E2E Tests
 *
 * NOTE: The recipe doesn't include a UI string translation system — hardcoded
 * text like "Add to cart" stays in English. Localization is routing- and
 * API-driven, not client-side string substitution.
 */

test.describe('Markets Recipe', () => {
  test.describe('Default Locale (USD)', () => {
    test('has no URL prefix and shows USD prices', async ({page}) => {
      const recipe = new MarketsUtil(page);
      await page.goto('/');

      expect(new URL(page.url()).pathname).toBe('/');

      await page.goto(`/products/${KNOWN_SKELETON_PRODUCT.handle}`);
      const priceElement = recipe.getPriceElement();
      await recipe.assertPriceFormat(priceElement, CURRENCY_FORMATS.USD);
    });
  });

  test.describe('FR-CA Locale', () => {
    test.beforeEach(async ({page}) => {
      const recipe = new MarketsUtil(page);
      await page.goto('/FR-CA');
      await recipe.assertLocaleInUrl('/FR-CA');
    });

    test('home page navigation links include locale prefix', async ({page}) => {
      const recipe = new MarketsUtil(page);
      await recipe.assertNavigationLinksHaveLocalePrefix('/FR-CA');
    });

    test('product page shows CAD prices', async ({page}) => {
      const recipe = new MarketsUtil(page);
      await page.goto(`/FR-CA/products/${KNOWN_SKELETON_PRODUCT.handle}`);

      const priceElement = recipe.getPriceElement();
      await recipe.assertPriceFormat(priceElement, CURRENCY_FORMATS.CAD);
    });

    test('collection page URL includes locale prefix and products link with locale', async ({
      page,
    }) => {
      const recipe = new MarketsUtil(page);
      await page.goto('/FR-CA/collections/all');

      await recipe.assertLocaleInUrl('/FR-CA/collections/all');
      await recipe.assertCollectionLinksHaveLocalePrefix('/FR-CA');
    });
  });

  test.describe('FR-CA Cart Flow', () => {
    test('locale prefix persists through cart flow and cart shows CAD prices', async ({
      page,
    }) => {
      const recipe = new MarketsUtil(page);
      const cart = new CartUtil(page);

      await page.goto(`/FR-CA/products/${KNOWN_SKELETON_PRODUCT.handle}`);

      await cart.addItem(KNOWN_SKELETON_PRODUCT.name);

      // CAD in the drawer proves AddToCartButton posted to /FR-CA/cart rather than /cart,
      // creating the cart with the correct market context.
      await recipe.assertCartSubtotalFormat(CURRENCY_FORMATS.CAD);

      await page.goto('/FR-CA/cart');
      await page.waitForURL(/\/FR-CA\/cart$/);

      await recipe.assertCartSubtotalFormat(CURRENCY_FORMATS.CAD);
    });
  });

  test.describe('Invalid Locale', () => {
    test('returns 404 for unsupported locale prefix', async ({page}) => {
      const response = await page.goto('/ZZ-ZZ/');
      expect(response?.status()).toBe(404);
    });
  });

  test.describe('Country Selector', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/FR-CA');
    });

    test('displays current locale and switches locale on selection', async ({
      page,
    }) => {
      const recipe = new MarketsUtil(page);

      await recipe.assertCountrySelectorVisible();
      await recipe.assertCurrentLocaleInSelector('FR-CA');

      // Clicking a switch button triggers a cart buyer identity update and
      // redirects to the selected locale's root — verify the redirect happens.
      await recipe.switchToFirstAvailableLocale('FR-CA');
    });
  });
});
