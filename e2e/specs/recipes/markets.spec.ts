import {test, expect, setRecipeFixture} from '../../fixtures';
import {MarketsUtil} from '../../fixtures/markets-utils';
import {CartUtil} from '../../fixtures/cart-utils';

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

// Stable product in the hydrogenPreviewStorefront used for price assertions.
// If this product is removed from the store, these tests will need updating.
const KNOWN_PRODUCT = {
  handle: 'the-ascend',
  name: 'The Ascend',
} as const;

const USD_FORMAT = /^\$[\d,]+\.\d{2}$/;
const CAD_FORMAT = /^CA\$[\d,]+\.\d{2}$/;

test.describe('Markets Recipe', () => {
  test.describe('Default Locale (USD)', () => {
    test('has no URL prefix and shows USD prices', async ({page}) => {
      const recipe = new MarketsUtil(page);
      await page.goto('/');

      await recipe.assertNoLocalePrefix();

      await page.goto(`/products/${KNOWN_PRODUCT.handle}`);
      const priceElement = recipe.getPriceElement();
      await recipe.assertPriceFormat(priceElement, USD_FORMAT);
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
      await page.goto(`/FR-CA/products/${KNOWN_PRODUCT.handle}`);

      const priceElement = recipe.getPriceElement();
      await recipe.assertPriceFormat(priceElement, CAD_FORMAT);
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

      await page.goto(`/FR-CA/products/${KNOWN_PRODUCT.handle}`);

      // Add to cart and wait for drawer to load
      await cart.addItem(KNOWN_PRODUCT.name);

      // CAD in the drawer proves AddToCartButton posted to /FR-CA/cart rather than /cart,
      // creating the cart with the correct market context.
      const cartDrawer = page.getByRole('dialog', {name: /cart/i});
      const drawerSubtotal = cartDrawer
        .getByRole('definition')
        .filter({hasText: CAD_FORMAT});
      await expect(drawerSubtotal).toBeVisible();

      // Navigate to cart page
      await page.goto('/FR-CA/cart');
      await page.waitForURL(/\/FR-CA\/cart$/);

      await recipe.assertCartPageSubtotalFormat(CAD_FORMAT);
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
      await recipe.switchToFirstAvailableLocale();
    });
  });
});
