import {test, expect, setTestStore} from '../../fixtures';

setTestStore('mockShop');

test.describe('Static Pages', () => {
  test('should display static page content', async ({page}) => {
    await page.goto('/pages/contact');

    const pageContent = page.getByRole('heading', {level: 1, name: 'Contact'});
    await expect(pageContent).toBeVisible();
  });
});
