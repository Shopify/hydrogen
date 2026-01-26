import {test, expect, setTestStore} from '../fixtures';

setTestStore('hydrogenPreviewStorefront');

test.describe('Static Pages', () => {
  test('should display all static page content', async ({page}) => {
    const pages = [
      {url: '/pages/about', heading: 'About'},
      {url: '/pages/homepage', heading: 'Homepage'},
      {url: '/pages/data-sharing-opt-out', heading: 'Your privacy choices'},
      {url: '/collections', heading: 'Collections'},
      {url: '/collections/all', heading: 'Products'},
      {url: '/blogs/journal', heading: 'Journal'},
    ];

    for (const {url, heading} of pages) {
      await page.goto(url);
      const pageContent = page.getByRole('heading', {level: 1, name: heading});
      await expect(pageContent).toBeVisible();
    }

    // graphiql
    await page.goto('/graphiql');
    const graphiqlPage = page.getByText('Storefront API');
    await expect(graphiqlPage).toBeVisible();
  });
});
