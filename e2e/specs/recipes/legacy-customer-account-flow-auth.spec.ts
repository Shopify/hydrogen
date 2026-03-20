import {
  test,
  expect,
  setRecipeFixture,
  MSW_SCENARIOS,
  LEGACY_CUSTOMER_MOCK,
} from '../../fixtures';

// Shares recipeName with the unauthenticated spec — the lock-and-wait
// mechanism in recipe.ts safely handles parallel workers generating the
// same fixture (see acquireLock/waitForFixture).
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
    test.beforeEach(async ({legacyCustomerAccount}) => {
      await legacyCustomerAccount.navigateToOrders();
    });

    test('renders welcome heading with customer first name', async ({
      legacyCustomerAccount,
    }) => {
      await expect(
        legacyCustomerAccount.getWelcomeHeading(LEGACY_CUSTOMER_MOCK.firstName),
      ).toBeVisible();
    });

    test('shows empty orders message with start shopping link', async ({
      legacyCustomerAccount,
    }) => {
      await legacyCustomerAccount.assertEmptyOrders();
    });

    test('displays account navigation menu', async ({
      legacyCustomerAccount,
    }) => {
      await legacyCustomerAccount.assertAccountMenuLinks();
    });
  });

  test.describe('Profile Page', () => {
    test.beforeEach(async ({legacyCustomerAccount}) => {
      await legacyCustomerAccount.navigateToProfile();
    });

    test('renders profile form pre-filled with customer data', async ({
      legacyCustomerAccount,
    }) => {
      await legacyCustomerAccount.assertProfilePageRendered({
        firstName: LEGACY_CUSTOMER_MOCK.firstName,
        lastName: LEGACY_CUSTOMER_MOCK.lastName,
        email: LEGACY_CUSTOMER_MOCK.email,
        phone: LEGACY_CUSTOMER_MOCK.phone,
      });
    });

    test('shows marketing preferences checkbox', async ({
      legacyCustomerAccount,
    }) => {
      await expect(legacyCustomerAccount.getMarketingCheckbox()).toBeVisible();
    });

    test('shows password change section', async ({legacyCustomerAccount}) => {
      await expect(legacyCustomerAccount.getNewPasswordInput()).toBeVisible();
      await expect(
        legacyCustomerAccount.getNewPasswordConfirmInput(),
      ).toBeVisible();
    });
  });

  test.describe('Addresses Page', () => {
    test.beforeEach(async ({legacyCustomerAccount}) => {
      await legacyCustomerAccount.navigateToAddresses();
    });

    test('renders addresses page with heading', async ({
      legacyCustomerAccount,
    }) => {
      await legacyCustomerAccount.assertAddressesPageRendered();
    });

    test('shows new address form with required fields', async ({
      legacyCustomerAccount,
    }) => {
      await expect(legacyCustomerAccount.getFirstNameInput()).toBeVisible();
      await expect(legacyCustomerAccount.getLastNameInput()).toBeVisible();
      await expect(legacyCustomerAccount.getCityInput()).toBeVisible();
    });
  });

  test.describe('Account Navigation', () => {
    test.beforeEach(async ({legacyCustomerAccount}) => {
      await legacyCustomerAccount.navigateToOrders();
    });

    test('clicking Profile link navigates to profile page', async ({
      page,
      legacyCustomerAccount,
    }) => {
      await legacyCustomerAccount.getAccountMenuLink(/profile/i).click();
      await expect(page).toHaveURL(/\/account\/profile/);
    });

    test('clicking Addresses link navigates to addresses page', async ({
      page,
      legacyCustomerAccount,
    }) => {
      await legacyCustomerAccount.getAccountMenuLink(/addresses/i).click();
      await expect(page).toHaveURL(/\/account\/addresses/);
    });
  });

  test.describe('Logout', () => {
    test('logout button submits form and redirects to home', async ({
      page,
      legacyCustomerAccount,
    }) => {
      await legacyCustomerAccount.navigateToOrders();
      await legacyCustomerAccount.getLogoutButton().click();
      await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);
    });
  });
});
