import {
  test,
  expect,
  setRecipeFixture,
  getRequiredSecret,
} from '../../fixtures';
import {MultipassUtil} from '../../fixtures/multipass-utils';
import {CartUtil} from '../../fixtures/cart-utils';
import {KNOWN_PRODUCT} from '../../fixtures/known-products';

setRecipeFixture({
  recipeName: 'multipass',
  storeKey: 'hydrogenPreviewStorefront',
});

test.describe('Multipass Recipe', () => {
  test.describe('Login Page', () => {
    let multipass: MultipassUtil;

    test.beforeEach(async ({page}) => {
      multipass = new MultipassUtil(page);
      await multipass.navigateToLogin();
    });

    test('renders login form with email, password fields and sign-in button', async () => {
      await multipass.assertLoginPageRendered();
    });

    test('shows forgot password and register links', async () => {
      await multipass.assertLoginPageLinks();
    });

    test('forgot password link points to /account/recover', async () => {
      const forgotLink = multipass.getLink(/forgot password/i);
      await expect(forgotLink).toHaveAttribute('href', '/account/recover');
    });

    test('register link points to /account/register', async () => {
      const registerLink = multipass.getLink(/register/i);
      await expect(registerLink).toHaveAttribute('href', '/account/register');
    });
  });

  test.describe('Register Page', () => {
    let multipass: MultipassUtil;

    test.beforeEach(async ({page}) => {
      multipass = new MultipassUtil(page);
      await multipass.navigateToRegister();
    });

    test('renders registration form with email, password, and confirm fields', async () => {
      await multipass.assertRegisterPageRendered();
    });

    test('shows link to login page', async () => {
      await multipass.assertRegisterPageLinks();
    });

    test('login link points to /account/login', async () => {
      const loginLink = multipass.getLink(/login/i);
      await expect(loginLink).toHaveAttribute('href', '/account/login');
    });
  });

  test.describe('Password Recovery Page', () => {
    let multipass: MultipassUtil;

    test.beforeEach(async ({page}) => {
      multipass = new MultipassUtil(page);
      await multipass.navigateToRecover();
    });

    test('renders recovery form with email field', async () => {
      await multipass.assertRecoverPageRendered();
    });

    test('shows link to login page', async () => {
      await multipass.assertRecoverPageLinks();
    });
  });

  test.describe('Password Reset Page', () => {
    let multipass: MultipassUtil;

    test.beforeEach(async ({page}) => {
      multipass = new MultipassUtil(page);
      await multipass.navigateToReset('123', 'test-token');
    });

    test('renders reset form with password fields', async () => {
      await multipass.assertResetPageRendered();
    });

    test('shows back to login link', async () => {
      await multipass.assertResetPageLinks();
    });
  });

  test.describe('Account Activation Page', () => {
    let multipass: MultipassUtil;

    test.beforeEach(async ({page}) => {
      multipass = new MultipassUtil(page);
      await multipass.navigateToActivate('456', 'test-activation-token');
    });

    test('renders activation form with password fields', async () => {
      await multipass.assertActivatePageRendered();
    });
  });

  test.describe('Storefront API Authentication', () => {
    let multipass: MultipassUtil;
    let email: string;
    let password: string;

    test.beforeEach(async ({page}) => {
      multipass = new MultipassUtil(page);
      email = getRequiredSecret('multipass_customer_email');
      password = getRequiredSecret('multipass_customer_password');
    });

    test('logs in and redirects to account orders page', async () => {
      await multipass.login(email, password);

      await multipass.assertAccountPageVisible();
    });

    test('persists session across navigation', async ({page}) => {
      await multipass.login(email, password);

      // Navigate away from the account area to a public page
      await page.goto('/');
      await expect(page).toHaveURL('/');

      // Return to an authenticated route — should NOT redirect to login
      await page.goto('/account/orders');
      await expect(page).toHaveURL(/\/account\/orders/);
      await multipass.assertAccountPageVisible();
    });

    test('redirects away from login page when already authenticated', async ({
      page,
    }) => {
      await multipass.login(email, password);

      await page.goto('/account/login');
      await expect(page).not.toHaveURL(/\/account\/login/);
    });

    test('renders orders page after login', async ({page}) => {
      await multipass.login(email, password);

      await page.goto('/account/orders');
      await expect(page).toHaveURL(/\/account\/orders/);
      await multipass.assertAccountPageVisible();
      await expect(page).toHaveTitle(/Orders/);
    });

    test('renders profile page after login', async ({page}) => {
      await multipass.login(email, password);

      await page.goto('/account/profile');
      await expect(page).toHaveURL(/\/account\/profile/);
      await expect(
        page.getByRole('heading', {name: /my profile/i}),
      ).toBeVisible();
    });

    test('renders addresses page after login', async ({page}) => {
      await multipass.login(email, password);

      await page.goto('/account/addresses');
      await expect(page).toHaveURL(/\/account\/addresses/);
      await expect(
        page.getByRole('heading', {name: /addresses/i}),
      ).toBeVisible();
    });

    test('shows error message for invalid credentials', async () => {
      await multipass.navigateToLogin();
      await multipass.fillLoginForm('invalid@example.com', 'wrongpassword');
      await multipass.submitLogin();

      await multipass.assertLoginError();
    });

    test('logs out and redirects to home page', async ({page}) => {
      await multipass.login(email, password);
      await multipass.logout();

      // After logout, visiting /account should redirect to login
      await page.goto('/account');
      await expect(page).toHaveURL(/\/account\/login/);
    });
  });

  test.describe('Unauthenticated Redirects', () => {
    test('GET /account/logout redirects to login', async ({page}) => {
      await page.goto('/account/logout');
      await expect(page).toHaveURL(/\/account\/login/);
    });

    test('redirects /account to login when not logged in', async ({page}) => {
      await page.goto('/account');
      await expect(page).toHaveURL(/\/account\/login/);
    });

    test('redirects /account/orders to login when not logged in', async ({
      page,
    }) => {
      await page.goto('/account/orders');
      await expect(page).toHaveURL(/\/account\/login/);
    });

    test('redirects /account/profile to login when not logged in', async ({
      page,
    }) => {
      await page.goto('/account/profile');
      await expect(page).toHaveURL(/\/account\/login/);
    });

    test('redirects /account/addresses to login when not logged in', async ({
      page,
    }) => {
      await page.goto('/account/addresses');
      await expect(page).toHaveURL(/\/account\/login/);
    });
  });

  test.describe('Header Navigation', () => {
    let multipass: MultipassUtil;

    test.beforeEach(async ({page}) => {
      multipass = new MultipassUtil(page);
      await page.goto('/');
    });

    test('header contains an account link', async () => {
      await multipass.assertHeaderHasAccountLink();
    });

    test('account link navigates to account area when clicked', async ({
      page,
    }) => {
      await multipass.getHeaderAccountLink().click();
      await expect(page).toHaveURL(/\/account/);
    });
  });

  test.describe('Multipass Checkout Button', () => {
    test('checkout renders as a button instead of a link after adding to cart', async ({
      page,
    }) => {
      const multipass = new MultipassUtil(page);
      const cart = new CartUtil(page);

      await page.goto(`/products/${KNOWN_PRODUCT.handle}`);
      await cart.addItem(KNOWN_PRODUCT.name);
      await expect(multipass.getCheckoutButton()).toBeVisible();
      await expect(
        page.getByRole('link', {name: /continue to checkout/i}),
      ).not.toBeVisible();
    });
  });
});
