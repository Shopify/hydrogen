import {test, expect, setTestStore} from '../../fixtures';

setTestStore('mockShop');

test.describe('Pages', () => {
  test('should display all static page content', async ({page}) => {
    const pages = [
      {url: '/pages/contact', heading: 'Contact'},
      {url: '/collections', heading: 'Collections'},
      {url: '/collections/men', heading: 'Men'},
      {url: '/blogs/news', heading: 'News'},
      {url: '/search', heading: 'Search'},
      {url: '/cart', heading: 'Cart'},
      {url: '/policies', heading: 'Policies'},
    ];

    for (const {url, heading} of pages) {
      await page.goto(url);
      const pageContent = page.getByRole('heading', {level: 1, name: heading});
      await expect(pageContent).toBeVisible();
    }

    await page.goto('/graphiql');
    const graphiqlPage = page.getByText('Storefront API');
    await expect(graphiqlPage).toBeVisible();
  });
});
