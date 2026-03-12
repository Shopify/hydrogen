import {test, expect, setRecipeFixture} from '../../fixtures';
import {CartUtil} from '../../fixtures/cart-utils';

setRecipeFixture({
  recipeName: 'bundles',
  storeKey: 'hydrogenPreviewStorefront',
});

// Stable bundle product in the hydrogenPreviewStorefront used for testing.
// This is a product bundle created using the Shopify Bundles app.
// If this product is removed from the store, these tests will need updating.
const KNOWN_BUNDLE = {
  handle: 'free-wax-bundle',
  name: 'The Hydrogen + Free Wax Bundle',
} as const;

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

      // Scoped to product card links so a product named "BUNDLE" doesn't
      // produce false positives. We deliberately avoid adding role="region"
      // to the recipe's collection route — semantic landmarks should serve
      // users, not exist to make tests easier to scope.
      const bundleProductCards = page
        .getByRole('link')
        .filter({has: page.getByText('BUNDLE', {exact: true})});

      await expect(bundleProductCards.first()).toBeVisible();
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
      await expect(
        page.locator('.product-image').getByText('BUNDLE', {exact: true}),
      ).toBeVisible();
    });

    test('displays bundled products section', async ({page}) => {
      const bundledProductsHeading = page.getByRole('heading', {
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
        page.getByRole('heading', {name: 'Bundled Products'}),
      ).toHaveCount(0);

      await expect(
        page.getByRole('button', {name: 'Add to cart'}),
      ).toBeVisible();

      await expect(
        page.getByRole('button', {name: /add bundle to cart/i}),
      ).toHaveCount(0);
    });

    test('does not display bundle badge in cart for regular products', async ({
      page,
    }) => {
      const cart = new CartUtil(page);

      await page.goto(`/products/${KNOWN_REGULAR_PRODUCT.handle}`);

      const addButton = page.getByRole('button', {name: 'Add to cart'});
      await addButton.click();

      await expect(page.getByRole('dialog', {name: 'Cart'})).toBeVisible();

      const lineItems = cart.getLineItems();
      await expect(lineItems.first()).toBeVisible();
      await expect(
        lineItems.first().getByText('BUNDLE', {exact: true}),
      ).toHaveCount(0);
    });
  });
});
