import {test, expect, setRecipeFixture} from '../../fixtures';
import {CartUtil} from '../../fixtures/cart-utils';

setRecipeFixture({
  recipeName: 'bundles',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Bundles recipe, which adds special styling and UI for product
 * bundles on the Hydrogen storefront using the Shopify Bundles app.
 *
 * Tests cover:
 * - Bundle badge display on product cards in grids
 * - Bundle badge display on product pages
 * - Bundled products section with component details
 * - Add to cart button text changes for bundles
 * - Bundle badge in cart line items
 *
 * The recipe queries `isBundle.requiresComponents` from the Storefront API
 * to determine if a product is a bundle, then renders conditional UI elements.
 */

// Stable bundle product in the hydrogenPreviewStorefront used for testing.
// This is a product bundle created using the Shopify Bundles app.
// If this product is removed from the store, these tests will need updating.
const KNOWN_BUNDLE = {
  handle: 'free-wax-bundle',
  name: 'The Hydrogen + Free Wax Bundle',
} as const;

// A non-bundle product for comparison tests
const KNOWN_REGULAR_PRODUCT = {
  handle: 'the-ascend',
  name: 'The Ascend',
} as const;

test.describe('Bundles Recipe', () => {
  test.describe('Product Cards', () => {
    test('displays bundle badges on product cards in collection grids', async ({
      page,
    }) => {
      await page.goto('/collections/bundles');

      const productsRegion = page.getByRole('region', {name: 'Products'});
      const bundleBadges = productsRegion.getByText('BUNDLE', {exact: true});

      await expect(bundleBadges.first()).toBeVisible();
    });
  });

  test.describe('Bundle Product Page', () => {
    test.beforeEach(async ({page}) => {
      await page.goto(`/products/${KNOWN_BUNDLE.handle}`);
      await expect(
        page.getByRole('heading', {level: 1, name: KNOWN_BUNDLE.name}),
      ).toBeVisible();
    });

    test('displays bundle badge on product image', async ({page}) => {
      await expect(page.getByText('BUNDLE', {exact: true})).toBeVisible();
    });

    test('displays bundled products section', async ({page}) => {
      const bundledProductsHeading = page.getByRole('heading', {
        level: 4,
        name: 'Bundled Products',
      });
      await expect(bundledProductsHeading).toBeVisible();

      const bundledProductLink = page
        .getByRole('link', {name: /Qty:\s*\d+/})
        .first();
      await expect(bundledProductLink).toBeVisible();
    });

    test('shows "Add bundle to cart" text on add to cart button', async ({
      page,
    }) => {
      const addButton = page.getByRole('button', {name: /add bundle to cart/i});
      await expect(addButton).toBeVisible();
    });
  });

  test.describe('Cart Flow', () => {
    test('displays bundle badge in cart line items after adding bundle', async ({
      page,
    }) => {
      const cart = new CartUtil(page);

      await page.goto(`/products/${KNOWN_BUNDLE.handle}`);

      const addButton = page.getByRole('button', {
        name: /add bundle to cart/i,
      });
      await addButton.click();

      await expect(page.getByRole('dialog', {name: 'Cart'})).toBeVisible();

      const lineItems = cart.getLineItems();
      await expect(lineItems.first()).toBeVisible();
      await expect(
        lineItems.first().getByText('BUNDLE', {exact: true}),
      ).toBeVisible();
    });
  });

  test.describe('Regular Product Page', () => {
    test('does not display bundle-specific UI on regular products', async ({
      page,
    }) => {
      await page.goto(`/products/${KNOWN_REGULAR_PRODUCT.handle}`);
      await expect(
        page.getByRole('heading', {level: 1, name: KNOWN_REGULAR_PRODUCT.name}),
      ).toBeVisible();

      await expect(page.getByText('BUNDLE', {exact: true})).toHaveCount(0);

      await expect(
        page.getByRole('heading', {level: 4, name: 'Bundled Products'}),
      ).toHaveCount(0);

      await expect(
        page.getByRole('button', {name: 'Add to cart'}),
      ).toBeVisible();

      await expect(
        page.getByRole('button', {name: /add bundle to cart/i}),
      ).toHaveCount(0);
    });
  });
});
