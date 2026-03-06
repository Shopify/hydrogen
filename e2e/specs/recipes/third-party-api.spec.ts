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
    const characterList = page
      .getByRole('main')
      .locator('.third-party-api-example ul');
    await expect(characterList).toBeVisible();

    const characters = characterList.getByRole('listitem');
    await expect(characters).toHaveCount(20);
  });
});
