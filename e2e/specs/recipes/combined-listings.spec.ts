import {test, expect, setRecipeFixture} from '../../fixtures';

setRecipeFixture({
  recipeName: 'combined-listings',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Tests for Combined Listings recipe, which groups separate products into
 * a single listing using shared options like color or size.
 */

// Combined listing product in hydrogenPreviewStorefront.
// This is a parent product that groups multiple products as variants.
const KNOWN_COMBINED_LISTING = {
  handle: 'the-snowboards',
  name: 'The Hydrogen Snowboards (Combined)',
  minPrice: '$500',
  maxPrice: '$700',
  variantOptionName: 'Color',
  knownVariant: 'Ember',
} as const;

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
      expect(mainText).toContain(KNOWN_COMBINED_LISTING.minPrice);
      expect(mainText).toContain(KNOWN_COMBINED_LISTING.maxPrice);
    });

    test('variant selection navigates to child product with options', async ({
      page,
    }) => {
      const variantLink = page
        .getByRole('main')
        .getByRole('link', {name: KNOWN_COMBINED_LISTING.knownVariant});
      await expect(variantLink).toBeVisible();

      await variantLink.click();

      await expect
        .poll(() =>
          new URL(page.url()).searchParams.has(
            KNOWN_COMBINED_LISTING.variantOptionName,
          ),
        )
        .toBe(true);
    });
  });

  test.describe('Collection Page', () => {
    test('parent combined listing products are filtered from collections', async ({
      page,
    }) => {
      await page.goto('/collections/all');

      const regularProductLink = page.getByRole('link', {
        name: 'The Hydrogen Snowboard',
      });
      await expect(regularProductLink.first()).toBeVisible();

      const parentProductCard = page.getByRole('link', {
        name: KNOWN_COMBINED_LISTING.name,
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
