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
 * - Price range display (From X To Y) on product pages
 * - Variant selection updates URL for combined listings
 * - Regular products still show "Add to cart" button normally
 *
 * The recipe uses the Combined Listings app to group separate products together
 * into a single product listing using a shared option like color or size.
 * By default, parent products are hidden from collection listings.
 */

// Combined listing product in hydrogenPreviewStorefront.
// This is a parent product that groups multiple products as variants.
const KNOWN_COMBINED_LISTING = {
  handle: 'the-snowboards',
  name: 'The Hydrogen Snowboards (Combined)',
} as const;

// A regular product for comparison tests
const KNOWN_REGULAR_PRODUCT = {
  handle: 'the-ascend',
  name: 'The Ascend',
} as const;

test.describe('Combined Listings Recipe', () => {
  test.describe('Combined Listing Product Page', () => {
    test.beforeEach(async ({page}) => {
      await page.goto(`/products/${KNOWN_COMBINED_LISTING.handle}`);
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    });

    test('hides "Add to cart" button on parent product', async ({page}) => {
      await expect(
        page.getByRole('button', {name: /add to cart/i}),
      ).not.toBeVisible();
    });

    test('displays price range from minimum to maximum', async ({page}) => {
      await expect(page.getByText('From')).toBeVisible();
      await expect(page.getByText('To')).toBeVisible();

      const priceText = await page.textContent('body');
      expect(priceText).toContain('$500');
      expect(priceText).toContain('$700');
    });

    test('variant selection updates URL', async ({page}) => {
      const initialUrl = page.url();

      const variantLinks = page.getByRole('link').filter({hasText: /.+/});
      const firstVariantLink = variantLinks.first();
      await expect(firstVariantLink).toBeVisible();

      await firstVariantLink.click();

      await expect.poll(() => page.url()).not.toBe(initialUrl);
    });
  });

  test.describe('Regular Product Page', () => {
    test.beforeEach(async ({page}) => {
      await page.goto(`/products/${KNOWN_REGULAR_PRODUCT.handle}`);
      await expect(
        page.getByRole('heading', {level: 1, name: KNOWN_REGULAR_PRODUCT.name}),
      ).toBeVisible();
    });

    test('shows "Add to cart" button on regular products', async ({page}) => {
      await expect(
        page.getByRole('button', {name: 'Add to cart'}),
      ).toBeVisible();
    });

    test('does not display price range', async ({page}) => {
      const priceSection = page.locator('text=From');
      await expect(priceSection).not.toBeVisible();
    });
  });
});
