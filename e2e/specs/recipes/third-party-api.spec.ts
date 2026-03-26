import {test, expect, setRecipeFixture} from '../../fixtures';

setRecipeFixture({
  recipeName: 'third-party-api',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Third-party API recipe, which demonstrates integrating
 * external GraphQL APIs with Oxygen's caching system.
 *
 * The recipe adds a Rick & Morty characters section to the homepage that
 * displays data fetched server-side from rickandmortyapi.com GraphQL API in the loader.
 *
 * ⚠️  Note: These tests depend on rickandmortyapi.com being available.
 * If the external API is down, slow, or rate-limited, tests may fail.
 * This is expected behavior as the recipe is designed to call this live API.
 */

const RECIPE_HEADING_TEXT = 'Rick & Morty Characters (Third-Party API Example)';

test.describe('Third-party API Recipe', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
  });

  test('displays Rick and Morty characters section with heading', async ({
    page,
  }) => {
    const heading = page.getByRole('heading', {
      name: RECIPE_HEADING_TEXT,
    });
    await expect(heading).toBeVisible();

    const description = page.getByText(
      /This data is fetched from rickandmortyapi\.com GraphQL API/i,
    );
    await expect(description).toBeVisible();
  });

  test('renders character list from third-party API', async ({page}) => {
    const recipeHeading = page.getByRole('heading', {
      name: RECIPE_HEADING_TEXT,
    });
    const recipeSection = page.locator('section').filter({has: recipeHeading});
    const characterList = recipeSection.getByRole('list');

    await expect(recipeSection).toBeVisible();
    await expect(characterList).toHaveCount(1);
    await expect(characterList).toBeVisible();

    const characters = characterList.getByRole('listitem');
    await expect(characters.first()).toBeVisible();
    await expect(characters.nth(1)).toBeVisible();
    await expect.poll(() => characters.count()).toBeGreaterThan(1);
    await expect(characters.first()).not.toHaveText(/^\s*$/);
    await expect(characters.first()).toContainText(/[A-Za-z]/);
  });

  test('preserves existing homepage sections alongside third-party content', async ({
    page,
  }) => {
    const featuredCollectionHeading = page.getByRole('heading', {level: 1});
    await expect(featuredCollectionHeading).toBeVisible();

    const recommendedProductsSection = page.getByRole('region', {
      name: 'Recommended Products',
    });
    await expect(recommendedProductsSection).toBeVisible();

    const recommendedProductLinks =
      recommendedProductsSection.getByRole('link');
    await expect(recommendedProductLinks.first()).toBeVisible();
    await expect.poll(() => recommendedProductLinks.count()).toBeGreaterThan(0);
  });
});
