import {
  test,
  expect,
  setRecipeFixture,
  MSW_SCENARIOS,
  LEGACY_CUSTOMER_MOCK,
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

test.describe('Legacy Customer Account Flow — Authenticated', () => {
  test.describe('Account Home Redirect', () => {
    test('redirects /account to /account/orders when logged in', async ({
      page,
    }) => {
      await page.goto('/account');
      await expect(page).toHaveURL(/\/account\/orders/);
    });
  });

  test.describe('Authenticated Redirects on Public Routes', () => {
    test('redirects /account/login to /account when already authenticated', async ({
      page,
    }) => {
      await page.goto('/account/login');
      await expect(page).toHaveURL(/\/account/);
      await expect(page).not.toHaveURL(/\/account\/login/);
    });

    test('redirects /account/register to /account when already authenticated', async ({
      page,
    }) => {
      await page.goto('/account/register');
      await expect(page).toHaveURL(/\/account/);
      await expect(page).not.toHaveURL(/\/account\/register/);
    });

    test('redirects /account/recover to /account when already authenticated', async ({
      page,
    }) => {
      await page.goto('/account/recover');
      await expect(page).toHaveURL(/\/account/);
      await expect(page).not.toHaveURL(/\/account\/recover/);
    });

    test('redirects unknown account sub-route to /account/orders when authenticated', async ({
      page,
    }) => {
      await page.goto('/account/nonexistent');
      await expect(page).toHaveURL(/\/account\/orders/);
    });
  });

  test.describe('Orders Page', () => {
    let recipe: LegacyCustomerAccountUtil;

    test.beforeEach(async ({page}) => {
      recipe = new LegacyCustomerAccountUtil(page);
      await recipe.navigateToOrders();
    });

    test('renders welcome heading with customer first name', async () => {
      await expect(
        recipe.getWelcomeHeading(LEGACY_CUSTOMER_MOCK.firstName),
      ).toBeVisible();
    });

    test('shows empty orders message with start shopping link', async () => {
      await recipe.assertEmptyOrders();
    });

    test('displays account navigation menu', async () => {
      await recipe.assertAccountMenuLinks();
    });
  });

  test.describe('Profile Page', () => {
    let recipe: LegacyCustomerAccountUtil;

    test.beforeEach(async ({page}) => {
      recipe = new LegacyCustomerAccountUtil(page);
      await recipe.navigateToProfile();
    });

    test('renders profile form pre-filled with customer data', async () => {
      await recipe.assertProfilePageRendered({
        firstName: LEGACY_CUSTOMER_MOCK.firstName,
        lastName: LEGACY_CUSTOMER_MOCK.lastName,
        email: LEGACY_CUSTOMER_MOCK.email,
        phone: LEGACY_CUSTOMER_MOCK.phone,
      });
    });

    test('shows marketing preferences checkbox', async () => {
      await expect(recipe.getMarketingCheckbox()).toBeVisible();
    });

    test('shows password change section', async () => {
      await expect(recipe.getNewPasswordInput()).toBeVisible();
      await expect(recipe.getNewPasswordConfirmInput()).toBeVisible();
    });
  });

  test.describe('Addresses Page', () => {
    let recipe: LegacyCustomerAccountUtil;

    test.beforeEach(async ({page}) => {
      recipe = new LegacyCustomerAccountUtil(page);
      await recipe.navigateToAddresses();
    });

    test('renders addresses page with heading', async () => {
      await recipe.assertAddressesPageRendered();
    });

    test('shows new address form with required fields', async () => {
      await expect(recipe.getFirstNameInput()).toBeVisible();
      await expect(recipe.getLastNameInput()).toBeVisible();
      await expect(recipe.getCityInput()).toBeVisible();
    });
  });

  test.describe('Account Navigation', () => {
    let recipe: LegacyCustomerAccountUtil;

    test.beforeEach(async ({page}) => {
      recipe = new LegacyCustomerAccountUtil(page);
      await recipe.navigateToOrders();
    });

    test('clicking Profile link navigates to profile page', async ({page}) => {
      await recipe.getAccountMenuLink(/profile/i).click();
      await expect(page).toHaveURL(/\/account\/profile/);
    });

    test('clicking Addresses link navigates to addresses page', async ({
      page,
    }) => {
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
