import {
  test,
  expect,
  setRecipeFixture,
  MSW_SCENARIOS,
  LEGACY_CUSTOMER_FIRST_NAME,
} from '../../fixtures';
import {LegacyCustomerAccountUtil} from '../../fixtures/legacy-customer-account-utils';

setRecipeFixture({
  recipeName: 'legacy-customer-account-flow',
  storeKey: 'hydrogenPreviewStorefront',
  mock: {
    scenario: MSW_SCENARIOS.legacyCustomerAccountLoggedIn,
  },
});

/**
 * Legacy Customer Account Flow — Authenticated E2E Tests
 *
 * These tests run with MSW session injection that writes a
 * customerAccessToken into the cookie session, simulating a
 * customer logged in via the Storefront API auth flow.
 *
 * Storefront API GraphQL queries (Customer, CustomerOrders) are
 * intercepted by MSW and return mock data. Non-customer queries
 * (products, collections, header/footer) fall through to the real store.
 *
 * NOTE: This is a separate file from the unauthenticated tests because
 * setRecipeFixture configures the dev server globally per-file. With MSW
 * session injection active, public routes like /account/login redirect
 * to /account (the login loader checks session.customerAccessToken).
 */

const legacyCustomerMock = {
  firstName: LEGACY_CUSTOMER_FIRST_NAME,
  lastName: 'E2E',
  email: 'taylor@example.com',
  phone: '+15551234567',
};

test.describe('Legacy Customer Account Flow — Authenticated', () => {
  test.describe('Account Home Redirect', () => {
    test('redirects /account to /account/orders when logged in', async ({
      page,
    }) => {
      await page.goto('/account');
      await expect(page).toHaveURL(/\/account\/orders/);
    });
  });

  test.describe('Orders Page', () => {
    test.beforeEach(async ({page}) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await recipe.navigateToOrders();
    });

    test('renders welcome heading with customer first name', async ({page}) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await recipe.assertOrdersPageRendered(legacyCustomerMock.firstName);
    });

    test('shows empty orders message with start shopping link', async ({
      page,
    }) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await recipe.assertEmptyOrders();
    });

    test('displays account navigation menu', async ({page}) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await recipe.assertAccountMenuLinks();
    });
  });

  test.describe('Profile Page', () => {
    test.beforeEach(async ({page}) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await recipe.navigateToProfile();
    });

    test('renders profile form pre-filled with customer data', async ({
      page,
    }) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await recipe.assertProfilePageRendered(legacyCustomerMock);
    });

    test('shows marketing preferences checkbox', async ({page}) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await expect(recipe.getMarketingCheckbox()).toBeVisible();
    });

    test('shows password change section', async ({page}) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await expect(recipe.getNewPasswordInput()).toBeVisible();
      await expect(recipe.getNewPasswordConfirmInput()).toBeVisible();
    });
  });

  test.describe('Addresses Page', () => {
    test.beforeEach(async ({page}) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await recipe.navigateToAddresses();
    });

    test('renders addresses page with heading', async ({page}) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await recipe.assertAddressesPageRendered();
    });

    test('shows new address form with required fields', async ({page}) => {
      await expect(
        page.getByRole('textbox', {name: /first name/i}),
      ).toBeVisible();
      await expect(
        page.getByRole('textbox', {name: /last name/i}),
      ).toBeVisible();
      await expect(page.getByRole('textbox', {name: /city/i})).toBeVisible();
    });
  });

  test.describe('Account Navigation', () => {
    test.beforeEach(async ({page}) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await recipe.navigateToOrders();
    });

    test('clicking Profile link navigates to profile page', async ({page}) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await recipe.getAccountMenuLink(/profile/i).click();
      await expect(page).toHaveURL(/\/account\/profile/);
    });

    test('clicking Addresses link navigates to addresses page', async ({
      page,
    }) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await recipe.getAccountMenuLink(/addresses/i).click();
      await expect(page).toHaveURL(/\/account\/addresses/);
    });
  });

  test.describe('Logout', () => {
    test('logout button submits form and redirects to home', async ({page}) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await recipe.navigateToOrders();
      await recipe.getLogoutButton().click();
      await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);
    });
  });
});
