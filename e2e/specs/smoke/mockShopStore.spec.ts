import {test, expect, setTestStore} from '../../fixtures';

// A scaffold pointed at a non-default mock.shop store: every store lives on its
// own host, so PUBLIC_STORE_DOMAIN=pets.mock.shop must serve that catalog, not
// the default apparel one.
setTestStore('mockShopStore');

test.describe('mock.shop non-default store', () => {
  test('serves the selected store instead of the default catalog', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    await expect(page.getByText('Paws and Whimsy').first()).toBeVisible();
    await expect(page.getByText('Mock.shop', {exact: true})).toHaveCount(0);
  });
});
