import {test, expect, setTestStore} from '../../fixtures';

setTestStore('mockShop');

test.describe('GraphiQL', () => {
  test('should display graphiql page', async ({page}) => {
    await page.goto('/graphiql');

    const graphiqlPage = page.getByText('Storefront API');
    await expect(graphiqlPage).toBeVisible();
  });
});
