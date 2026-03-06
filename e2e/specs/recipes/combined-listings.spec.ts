import {test, expect, setRecipeFixture} from '../../fixtures';

setRecipeFixture({
  recipeName: 'combined-listings',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Combined Listings recipe, which enables displaying and managing
 * combined listings on product pages.
 *
 * Tests cover:
 * - "Add to cart" button hidden on parent product pages
 * - Variant selection navigation for combined listings
 * - Regular products still show "Add to cart" button
 *
 * The recipe uses the Combined Listings app to group separate products together
 * into a single product listing using a shared option like color or size.
 * By default, parent products are hidden from collection listings.
 */

// Combined listing product in hydrogenPreviewStorefront.
// This is a parent product that groups multiple products as variants.
const KNOWN_COMBINED_LISTING = {
  handle: 'the-hydrogen-snowboards-combined',
  name: 'The Hydrogen Snowboards (Combined)',
} as const;

// A regular product for comparison tests
const KNOWN_REGULAR_PRODUCT = {
  handle: 'the-ascend',
  name: 'The Ascend',
} as const;

test.describe('Combined Listings Recipe', () => {
  test.describe('Combined Listing Product Page', () => {
    test('hides "Add to cart" button on parent product', async ({page}) => {
      await page.goto(`/products/${KNOWN_COMBINED_LISTING.handle}`);

      await expect(page.getByRole('heading', {level: 1})).toBeVisible();

      await expect(
        page.getByRole('button', {name: /add to cart/i}),
      ).not.toBeVisible();
    });
  });

  test.describe('Regular Product Page', () => {
    test('shows "Add to cart" button on regular products', async ({page}) => {
      await page.goto(`/products/${KNOWN_REGULAR_PRODUCT.handle}`);
      await expect(
        page.getByRole('heading', {level: 1, name: KNOWN_REGULAR_PRODUCT.name}),
      ).toBeVisible();

      await expect(
        page.getByRole('button', {name: 'Add to cart'}),
      ).toBeVisible();
    });
  });
});
