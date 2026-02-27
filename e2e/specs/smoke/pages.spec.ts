import {test, expect, setTestStore} from '../../fixtures';

setTestStore('mockShop');

test.describe('Pages', () => {
  test('When visiting static pages, each should display its heading', async ({
    page,
  }) => {
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
      const pageHeading = page.getByRole('heading', {level: 1, name: heading});
      await expect(pageHeading).toBeVisible();
    }

    await page.goto('/graphiql');
    const storefrontApiText = page.getByText('Storefront API');
    await expect(storefrontApiText).toBeVisible();
  });
});
