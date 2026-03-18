import {
  setTestStore,
  test,
  expect,
  getRequiredSecret,
  TUNNEL_SETUP_TIMEOUT_IN_MS,
  CUSTOMER_ACCOUNT_STORAGE_STATE_PATH,
} from '../../fixtures';

// Pass CUSTOMER_ACCOUNT_URL to skip the tunnel and use an existing dev server, e.g.:
//   CUSTOMER_ACCOUNT_URL=https://xyz.tryhydrogen.dev npx playwright test --project=skeleton
const externalUrl = process.env.CUSTOMER_ACCOUNT_URL;

if (externalUrl) {
  setTestStore(externalUrl as `https://${string}`);
} else {
  setTestStore('customerAccount', {customerAccountPush: true});
}

// When running against a password-protected Oxygen deployment, inject the
// auth bypass token as a cookie so Playwright requests aren't blocked.
const authBypassToken = process.env.OXYGEN_AUTH_BYPASS_TOKEN;
if (authBypassToken && externalUrl) {
  const oxygenUrl = new URL(externalUrl);
  test.use({
    storageState: {
      cookies: [
        {
          name: '_oxygen_auth_bypass_token',
          value: authBypassToken,
          domain: oxygenUrl.hostname,
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'None' as const,
        },
      ],
      origins: [],
    },
  });
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

// Serial mode: Auth Setup saves a session to disk that subsequent blocks
// load via test.use({ storageState }). Parallel execution would race on
// that shared file and break the dependency chain.
const oxygenDeployTimeoutInMs = 60_000;
const testTimeoutInMs = externalUrl
  ? oxygenDeployTimeoutInMs
  : TUNNEL_SETUP_TIMEOUT_IN_MS;

test.describe.configure({
  mode: 'serial',
  timeout: testTimeoutInMs,
});

test.describe('Customer Account', {tag: '@customer-account'}, () => {
  // Performs the full OAuth login once and saves the browser session to disk.
  // Subsequent describe blocks load this file via test.use({ storageState })
  // to skip the expensive Shopify redirect chain.
  test.describe('Auth Setup', () => {
    test('logs in and saves session for reuse', async ({customerAccount}) => {
      await customerAccount.login(testEmail);
      await customerAccount.expectLoggedIn();
      await customerAccount.saveStorageState(
        CUSTOMER_ACCOUNT_STORAGE_STATE_PATH,
      );
    });
  });

  // Intentionally performs full OAuth to test the login flow end-to-end
  // (does not use saved storageState)
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
    // The saved session file from Auth Setup includes the Oxygen bypass cookie
    // because it was present in the browser context at save time. This inner
    // test.use fully replaces the file-level storageState, but the bypass
    // cookie survives because it's included in the saved file.
    test.use({storageState: CUSTOMER_ACCOUNT_STORAGE_STATE_PATH});

    test('stays logged in after navigating away and back', async ({
      page,
      customerAccount,
    }) => {
      // storageState pre-seeds session cookies — load a page to verify they work
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await customerAccount.expectLoggedIn();

      await customerAccount.navigateToAccount();
      await customerAccount.expectAccountPageVisible();
    });
  });

  test.describe('Account Pages', () => {
    // See Auth Persistence comment — bypass cookie is embedded in the saved session file
    test.use({storageState: CUSTOMER_ACCOUNT_STORAGE_STATE_PATH});

    test('navigates to orders page', async ({page}) => {
      await page.goto('/account/orders');
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/account/orders');
      // The orders page renders a filter form, not a heading
      await expect(
        page.getByRole('group', {name: /filter orders/i}),
      ).toBeVisible();
    });

    test('navigates to profile page', async ({page}) => {
      await page.goto('/account/profile');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', {level: 2, name: /my profile/i}),
      ).toBeVisible();
    });

    test('navigates to addresses page', async ({page}) => {
      await page.goto('/account/addresses');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', {level: 2, name: /addresses/i}),
      ).toBeVisible();
    });
  });

  // Logout must run after all auth-dependent blocks because it invalidates
  // the server-side session. Unauthenticated runs last and doesn't need auth.
  test.describe('Logout', () => {
    // See Auth Persistence comment — bypass cookie is embedded in the saved session file
    test.use({storageState: CUSTOMER_ACCOUNT_STORAGE_STATE_PATH});

    test('logs out and shows sign-in link', async ({page, customerAccount}) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
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
