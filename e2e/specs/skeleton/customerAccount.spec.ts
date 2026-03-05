import {setTestStore, test, expect, getRequiredSecret} from '../../fixtures';

// Pass CUSTOMER_ACCOUNT_URL to skip the tunnel and use an existing dev server, e.g.:
//   CUSTOMER_ACCOUNT_URL=https://xyz.tryhydrogen.dev npx playwright test --project=skeleton
const tunnelUrl = process.env.CUSTOMER_ACCOUNT_URL;

if (tunnelUrl) {
  setTestStore(tunnelUrl as `https://${string}`);
} else {
  setTestStore('customerAccount', {customerAccountPush: true});
}

function getTestEmail(): string {
  if (process.env.CUSTOMER_ACCOUNT_TEST_EMAIL) {
    return process.env.CUSTOMER_ACCOUNT_TEST_EMAIL;
  }

  try {
    return getRequiredSecret('customer_account_email');
  } catch {
    throw new Error(
      'Customer account test email not available.\n\n' +
        'Set CUSTOMER_ACCOUNT_TEST_EMAIL env var, or configure ejson:\n' +
        '  ./scripts/setup-ejson-private-key.sh\n',
    );
  }
}

let testEmail: string;

test.beforeAll(() => {
  testEmail = getTestEmail();
});

// Run serially so all tests share one DevServer/tunnel instance.
// Each worker spawns its own Cloudflare tunnel, and parallel workers
// quickly hit Cloudflare's rate limit (429 Too Many Requests).
test.describe.configure({mode: 'serial'});

test.describe('Customer Account', () => {
  test.describe('Login', () => {
    test('logs in with OTP bypass and shows account page', async ({
      customerAccount,
    }) => {
      await customerAccount.login(testEmail);
      await customerAccount.expectAccountPageVisible();
      await customerAccount.expectLoggedIn();
    });

    test('shows account navigation after login', async ({customerAccount}) => {
      await customerAccount.login(testEmail);
      await customerAccount.expectAccountNavVisible();
    });
  });

  test.describe('Auth Persistence', () => {
    test('stays logged in after navigating away and back', async ({
      page,
      customerAccount,
    }) => {
      await customerAccount.login(testEmail);
      await customerAccount.expectLoggedIn();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await customerAccount.navigateToAccount();
      await customerAccount.expectAccountPageVisible();
    });
  });

  test.describe('Account Pages', () => {
    test.beforeEach(async ({customerAccount}) => {
      await customerAccount.login(testEmail);
    });

    test('navigates to orders page', async ({page}) => {
      await page.goto('/account/orders');
      await page.waitForLoadState('networkidle');

      const heading = page.getByRole('heading', {level: 1});
      await expect(heading).toBeVisible();
    });

    test('navigates to profile page', async ({page}) => {
      await page.goto('/account/profile');
      await page.waitForLoadState('networkidle');

      const heading = page.getByRole('heading', {level: 1});
      await expect(heading).toBeVisible();
    });

    test('navigates to addresses page', async ({page}) => {
      await page.goto('/account/addresses');
      await page.waitForLoadState('networkidle');

      const heading = page.getByRole('heading', {level: 1});
      await expect(heading).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('logs out and shows sign-in link', async ({page, customerAccount}) => {
      await customerAccount.login(testEmail);
      await customerAccount.expectLoggedIn();

      await customerAccount.navigateToAccount();
      await customerAccount.logout();

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await customerAccount.expectLoggedOut();
    });
  });

  test.describe('Unauthenticated', () => {
    test('redirects to login when visiting /account unauthenticated', async ({
      page,
    }) => {
      await page.goto('/account');

      // Should redirect to Shopify's hosted login page
      await page.waitForURL(/shopify\.com|\/account\/login/, {timeout: 30000});
    });
  });
});
