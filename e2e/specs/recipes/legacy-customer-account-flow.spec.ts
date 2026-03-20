import {test, expect, setRecipeFixture} from '../../fixtures';

setRecipeFixture({
  recipeName: 'legacy-customer-account-flow',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Legacy Customer Account Flow Recipe E2E Tests
 *
 * This recipe replaces the Customer Account API with Storefront API-based
 * authentication using form-based login, registration, and password recovery.
 * Session-based auth stores customer access tokens in cookies.
 *
 * Since these tests run against a real Storefront API without mocked auth,
 * they focus on unauthenticated flows: page rendering, form structure,
 * navigation between auth routes, and redirect behavior.
 */

test.describe('Legacy Customer Account Flow Recipe', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({legacyCustomerAccount}) => {
      await legacyCustomerAccount.navigateToLogin();
    });

    test('renders login form with email and password fields', async ({
      legacyCustomerAccount,
    }) => {
      await legacyCustomerAccount.assertLoginPageRendered();
    });

    test('shows links to register and forgot password', async ({
      legacyCustomerAccount,
    }) => {
      await legacyCustomerAccount.assertLoginPageLinks();
    });

    test('navigates to register page via link', async ({
      page,
      legacyCustomerAccount,
    }) => {
      await page.getByRole('link', {name: /register/i}).click();
      await expect(page).toHaveURL(/\/account\/register/);
      await legacyCustomerAccount.assertRegisterPageRendered();
    });

    test('navigates to recover page via forgot password link', async ({
      page,
      legacyCustomerAccount,
    }) => {
      await page.getByRole('link', {name: /forgot password/i}).click();
      await expect(page).toHaveURL(/\/account\/recover/);
      await legacyCustomerAccount.assertRecoverPageRendered();
    });
  });

  test.describe('Register Page', () => {
    test.beforeEach(async ({legacyCustomerAccount}) => {
      await legacyCustomerAccount.navigateToRegister();
    });

    test('renders registration form with email, password, and confirm fields', async ({
      legacyCustomerAccount,
    }) => {
      await legacyCustomerAccount.assertRegisterPageRendered();
    });

    test('shows link to login page', async ({legacyCustomerAccount}) => {
      await legacyCustomerAccount.assertRegisterPageLinks();
    });

    test('navigates to login page via link', async ({
      page,
      legacyCustomerAccount,
    }) => {
      await page.getByRole('link', {name: /login/i}).click();
      await expect(page).toHaveURL(/\/account\/login/);
      await legacyCustomerAccount.assertLoginPageRendered();
    });
  });

  test.describe('Password Recovery Page', () => {
    test.beforeEach(async ({legacyCustomerAccount}) => {
      await legacyCustomerAccount.navigateToRecover();
    });

    test('renders recovery form with email field', async ({
      legacyCustomerAccount,
    }) => {
      await legacyCustomerAccount.assertRecoverPageRendered();
    });

    test('shows link to login page', async ({legacyCustomerAccount}) => {
      await legacyCustomerAccount.assertRecoverPageLinks();
    });

    test('navigates to login page via link', async ({
      page,
      legacyCustomerAccount,
    }) => {
      await page.getByRole('link', {name: /login/i}).click();
      await expect(page).toHaveURL(/\/account\/login/);
      await legacyCustomerAccount.assertLoginPageRendered();
    });
  });

  test.describe('Unauthenticated Redirects', () => {
    test('redirects /account to /account/login when not logged in', async ({
      page,
    }) => {
      await page.goto('/account');
      await expect(page).toHaveURL(/\/account\/login/);
    });

    test('redirects /account/orders to /account/login when not logged in', async ({
      page,
    }) => {
      await page.goto('/account/orders');
      await expect(page).toHaveURL(/\/account\/login/);
    });

    test('redirects /account/profile to /account/login when not logged in', async ({
      page,
    }) => {
      await page.goto('/account/profile');
      await expect(page).toHaveURL(/\/account\/login/);
    });

    test('redirects /account/addresses to /account/login when not logged in', async ({
      page,
    }) => {
      await page.goto('/account/addresses');
      await expect(page).toHaveURL(/\/account\/login/);
    });

    test('logout route redirects to /account/login', async ({page}) => {
      await page.goto('/account/logout');
      await expect(page).toHaveURL(/\/account\/login/);
    });
  });

  test.describe('Header Navigation', () => {
    test('header contains an account link', async ({
      page,
      legacyCustomerAccount,
    }) => {
      await page.goto('/');
      await legacyCustomerAccount.assertHeaderHasAccountLink();
    });

    test('account link navigates to login page when not authenticated', async ({
      page,
      legacyCustomerAccount,
    }) => {
      await page.goto('/');
      await legacyCustomerAccount.getHeaderAccountLink().click();
      await expect(page).toHaveURL(/\/account\/login/);
    });
  });
});
