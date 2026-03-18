import {test, expect, setRecipeFixture} from '../../fixtures';
import {LegacyCustomerAccountUtil} from '../../fixtures/legacy-customer-account-utils';

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
    let recipe: LegacyCustomerAccountUtil;

    test.beforeEach(async ({page}) => {
      recipe = new LegacyCustomerAccountUtil(page);
      await recipe.navigateToLogin();
    });

    test('renders login form with email and password fields', async () => {
      await recipe.assertLoginPageRendered();
    });

    test('shows links to register and forgot password', async () => {
      await recipe.assertLoginPageLinks();
    });

    test('navigates to register page via link', async ({page}) => {
      await recipe.getLink(/register/i).click();
      await expect(page).toHaveURL(/\/account\/register/);
      await recipe.assertRegisterPageRendered();
    });

    test('navigates to recover page via forgot password link', async ({
      page,
    }) => {
      await recipe.getLink(/forgot password/i).click();
      await expect(page).toHaveURL(/\/account\/recover/);
      await recipe.assertRecoverPageRendered();
    });
  });

  test.describe('Register Page', () => {
    let recipe: LegacyCustomerAccountUtil;

    test.beforeEach(async ({page}) => {
      recipe = new LegacyCustomerAccountUtil(page);
      await recipe.navigateToRegister();
    });

    test('renders registration form with email, password, and confirm fields', async () => {
      await recipe.assertRegisterPageRendered();
    });

    test('shows link to login page', async () => {
      await recipe.assertRegisterPageLinks();
    });

    test('navigates to login page via link', async ({page}) => {
      await recipe.getLink(/login/i).click();
      await expect(page).toHaveURL(/\/account\/login/);
      await recipe.assertLoginPageRendered();
    });
  });

  test.describe('Password Recovery Page', () => {
    let recipe: LegacyCustomerAccountUtil;

    test.beforeEach(async ({page}) => {
      recipe = new LegacyCustomerAccountUtil(page);
      await recipe.navigateToRecover();
    });

    test('renders recovery form with email field', async () => {
      await recipe.assertRecoverPageRendered();
    });

    test('shows link to login page', async () => {
      await recipe.assertRecoverPageLinks();
    });

    test('navigates to login page via link', async ({page}) => {
      await recipe.getLink(/login/i).click();
      await expect(page).toHaveURL(/\/account\/login/);
      await recipe.assertLoginPageRendered();
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
    test('header contains an account link', async ({page}) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await page.goto('/');
      await recipe.assertHeaderHasAccountLink();
    });

    test('account link navigates to login page when not authenticated', async ({
      page,
    }) => {
      const recipe = new LegacyCustomerAccountUtil(page);
      await page.goto('/');
      await recipe.getHeaderAccountLink().click();
      await expect(page).toHaveURL(/\/account\/login/);
    });
  });
});
