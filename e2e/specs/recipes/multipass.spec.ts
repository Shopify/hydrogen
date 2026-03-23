import {test, expect, setRecipeFixture} from '../../fixtures';
import {MultipassUtil} from '../../fixtures/multipass-utils';
import {CartUtil} from '../../fixtures/cart-utils';

setRecipeFixture({
  recipeName: 'multipass',
  storeKey: 'hydrogenPreviewStorefront',
});

const KNOWN_PRODUCT = {
  handle: 'the-ascend',
  name: 'The Ascend',
} as const;

test.describe('Multipass Recipe', () => {
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

    test('login link points to /account/login', async () => {
      const loginLink = multipass.getLink(/login/i);
      await expect(loginLink).toHaveAttribute('href', '/account/login');
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

    test('back to login link points to /account/login', async () => {
      const backLink = multipass.getLink(/back to login/i);
      await expect(backLink).toHaveAttribute('href', '/account/login');
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

    test('does not show a login link', async () => {
      await expect(multipass.getLink(/login/i)).not.toBeVisible();
    });
  });

  test.describe('Unauthenticated Redirects', () => {
    test('redirects away from /account when not logged in', async ({page}) => {
      await page.goto('/account');
      await expect(page).not.toHaveURL(/\/account$/);
    });

    test('redirects away from /account/orders when not logged in', async ({
      page,
    }) => {
      await page.goto('/account/orders');
      await expect(page).not.toHaveURL(/\/account\/orders/);
    });

    test('redirects away from /account/profile when not logged in', async ({
      page,
    }) => {
      await page.goto('/account/profile');
      await expect(page).not.toHaveURL(/\/account\/profile/);
    });

    test('redirects away from /account/addresses when not logged in', async ({
      page,
    }) => {
      await page.goto('/account/addresses');
      await expect(page).not.toHaveURL(/\/account\/addresses/);
    });

    test('redirects away from /account/logout when not logged in', async ({
      page,
    }) => {
      await page.goto('/account/logout');
      await expect(page).not.toHaveURL(/\/account\/logout/);
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

    test('account link navigates away from home page when clicked', async ({
      page,
    }) => {
      const homeUrl = page.url();
      await multipass.getHeaderAccountLink().click();
      await expect(page).not.toHaveURL(homeUrl);
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
