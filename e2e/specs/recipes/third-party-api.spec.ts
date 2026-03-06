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
 * fetches data from rickandmortyapi.com GraphQL API.
 */

test.describe('Third-party API Recipe', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
  });

  test('displays Rick and Morty characters section with heading', async ({
    page,
  }) => {
    const heading = page.getByRole('heading', {
      name: 'Rick & Morty Characters (Third-Party API Example)',
    });
    await expect(heading).toBeVisible();

    const description = page.getByText(
      /This data is fetched from rickandmortyapi\.com GraphQL API/i,
    );
    await expect(description).toBeVisible();
  });

  test('renders character list from third-party API', async ({page}) => {
    const recipeHeading = page.getByRole('heading', {
      name: 'Rick & Morty Characters (Third-Party API Example)',
    });
    const recipeSection = page.locator('section').filter({has: recipeHeading});
    const characterList = recipeSection.getByRole('list');

    await expect(recipeSection).toBeVisible();
    await expect(characterList).toHaveCount(1);
    await expect(characterList).toBeVisible();

    const characters = characterList.getByRole('listitem');
    await expect(characters.first()).toBeVisible();
    await expect(characters.nth(1)).toBeVisible();
    expect(await characters.count()).toBeGreaterThan(1);
    await expect(characters.first()).not.toHaveText(/^\s*$/);
    await expect(characters.first()).toContainText(/[A-Za-z]/);
  });

  test('preserves existing homepage sections alongside third-party content', async ({
    page,
  }) => {
    const featuredCollectionHeading = page.getByRole('heading', {level: 1});
    await expect(featuredCollectionHeading).toBeVisible();
    await expect(featuredCollectionHeading).not.toHaveText(/^\s*$/);

    const recommendedProductsSection = page.getByRole('region', {
      name: 'Recommended Products',
    });
    await expect(recommendedProductsSection).toBeVisible();

    const recommendedProductLinks =
      recommendedProductsSection.getByRole('link');
    await expect(recommendedProductLinks.first()).toBeVisible();
    expect(await recommendedProductLinks.count()).toBeGreaterThan(0);
  });
});
