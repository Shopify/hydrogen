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
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: KNOWN_COMBINED_LISTING.name,
        }),
      ).toBeVisible();
    });

    test('hides "Add to cart" button on parent product', async ({page}) => {
      await expect(
        page.getByRole('button', {name: /add to cart/i}),
      ).toHaveCount(0);
    });

    test('displays price range from minimum to maximum', async ({page}) => {
      const main = page.getByRole('main');
      await expect(main.getByText(/From\s*\$/)).toBeVisible();
      await expect(main.getByText(/To\s*\$/)).toBeVisible();

      const mainText = await main.textContent();
      expect(mainText).toContain('$500');
      expect(mainText).toContain('$700');
    });

    test('variant selection updates URL', async ({page}) => {
      const initialUrl = page.url();

      const variantLinks = page.getByRole('main').getByRole('link');
      const firstVariantLink = variantLinks.first();
      await expect(firstVariantLink).toBeVisible();

      await firstVariantLink.click();

      await expect.poll(() => page.url()).not.toBe(initialUrl);
    });
  });

  test.describe('Collection Page', () => {
    test('parent combined listing products are filtered from collections', async ({
      page,
    }) => {
      await page.goto('/collections/all');

      const parentProductCard = page.getByRole('link', {
        name: new RegExp(KNOWN_COMBINED_LISTING.name, 'i'),
      });
      await expect(parentProductCard).toHaveCount(0);
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
      const main = page.getByRole('main');
      await expect(main.getByText(/From\s*\$/)).toHaveCount(0);
      await expect(main.getByText(/To\s*\$/)).toHaveCount(0);
    });
  });
});
