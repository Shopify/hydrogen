import {test, expect, setTestStore} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

test.describe('Pages', () => {
  test('When visiting static pages, each should display its heading', async ({
    page,
  }) => {
    const pages = [
      {url: '/pages/about', heading: 'About'},
      {url: '/collections', heading: 'Collections'},
      {url: '/collections/all', heading: 'Products'},
      {url: '/blogs/journal', heading: 'Journal'},
      {url: '/search', heading: 'Search'},
      {url: '/cart', heading: 'Cart'},
      {url: '/policies', heading: 'Policies'},
    ];

    for (const {url, heading} of pages) {
      await page.goto(url);
      const pageHeading = page.getByRole('heading', {level: 1, name: heading});
      await expect(pageHeading).toBeVisible();
    }
  });
});
