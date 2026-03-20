import {expect, setTestStore, test, MSW_SCENARIOS} from '../../fixtures';

setTestStore('mockShop', {
  mock: {
    scenario: MSW_SCENARIOS.customerAccountLoggedIn,
  },
});

const ACCOUNT_URL_PATTERN = /\/account(?:\/orders)?$/;

test.describe('Account route with MSW Customer Account mocks', () => {
  test('renders /account as logged in', async ({page}) => {
    await page.goto('/account');

    await expect(page).toHaveURL(ACCOUNT_URL_PATTERN);
    await expect(
      page.getByRole('heading', {level: 1, name: 'Welcome, Taylor'}),
    ).toBeVisible();
    await expect(
      page.getByRole('form', {name: 'Search orders'}),
    ).toBeVisible();
    await expect(
      page.getByText("You haven't placed any orders yet."),
    ).toBeVisible();
  });
});
