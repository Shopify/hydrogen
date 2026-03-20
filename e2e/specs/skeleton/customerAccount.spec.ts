import {unlink} from 'node:fs/promises';
import {
  setTestStore,
  test,
  expect,
  getRequiredSecret,
  getLoadtestHeaders,
  TUNNEL_SETUP_TIMEOUT_IN_MS,
  CUSTOMER_ACCOUNT_STORAGE_STATE_PATH,
} from '../../fixtures';

// Pass CUSTOMER_ACCOUNT_URL to skip the tunnel and use an existing dev server, e.g.:
//   CUSTOMER_ACCOUNT_URL=https://xyz.tryhydrogen.dev npx playwright test --project=skeleton
const externalUrl = process.env.CUSTOMER_ACCOUNT_URL;

if (externalUrl) {
  if (!externalUrl.startsWith('https://')) {
    throw new Error(
      `CUSTOMER_ACCOUNT_URL must start with "https://", got: ${externalUrl}`,
    );
  }
  setTestStore(externalUrl as `https://${string}`);
} else {
  setTestStore('customerAccount', {customerAccountPush: true});
}

// When running against a password-protected Oxygen deployment, inject the
// auth bypass token as an HTTP header so Oxygen serves the app instead of
// redirecting to its OAuth password page. Oxygen checks request headers
// (not cookies) for this token.
// See: https://shopify.dev/docs/storefronts/headless/hydrogen/debugging/end-to-end-testing
//
// IMPORTANT: test.use() replaces (not merges) extraHTTPHeaders from the
// global playwright config. We must spread the config's loadtest header
// here, otherwise the OTP bypass breaks because the loadtest header is lost.
const authBypassToken = process.env.OXYGEN_AUTH_BYPASS_TOKEN;
if (authBypassToken && externalUrl) {
  test.use({
    extraHTTPHeaders: {
      ...getLoadtestHeaders(),
      'oxygen-auth-bypass-token': authBypassToken,
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

  const headers = getLoadtestHeaders();
  if (Object.keys(headers).length === 0) {
    throw new Error(
      'Loadtest header not available — OTP bypass will not work.\n' +
        'Set up ejson: ./scripts/setup-ejson-private-key.sh',
    );
  }
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
    test.beforeAll(async () => {
      // Delete any stale session file from a previous run. Without this,
      // if Auth Setup fails, subsequent tests would load stale credentials
      // and could produce false positives in local development.
      await unlink(CUSTOMER_ACCOUNT_STORAGE_STATE_PATH).catch(() => {});
    });

    test('logs in and saves session for reuse', async ({customerAccount}) => {
      await customerAccount.login(testEmail);
      await customerAccount.expectLoggedIn();
      await customerAccount.saveStorageState(
        CUSTOMER_ACCOUNT_STORAGE_STATE_PATH,
      );
    });
  });

  // Intentionally performs full OAuth to test the login flow end-to-end
  // (does not use saved storageState). Assertions cover account page
  // visibility, auth state in the header, and account navigation links.
  test.describe('Login', () => {
    test('logs in with OTP bypass and shows account page', async ({
      customerAccount,
    }) => {
      await customerAccount.login(testEmail);
      await customerAccount.expectAccountPageVisible();
      await customerAccount.expectLoggedIn();
      await customerAccount.expectAccountNavVisible();
    });
  });

  test.describe('Auth Persistence', () => {
    // Load the saved session from Auth Setup so we skip the full OAuth flow.
    // The Oxygen auth bypass is handled via extraHTTPHeaders (file-level),
    // which applies to all tests regardless of storageState overrides.
    test.use({storageState: CUSTOMER_ACCOUNT_STORAGE_STATE_PATH});

    test('stays logged in after navigating away and back', async ({
      page,
      customerAccount,
    }) => {
      // storageState pre-seeds session cookies — load a page to verify they work
      await page.goto('/');
      await customerAccount.expectLoggedIn();

      await customerAccount.navigateToAccount();
    });
  });

  test.describe('Account Pages', () => {
    // Load saved session — bypass header is applied file-level via extraHTTPHeaders
    test.use({storageState: CUSTOMER_ACCOUNT_STORAGE_STATE_PATH});

    test('navigates to orders page', async ({page}) => {
      await page.goto('/account/orders');

      expect(page.url()).toContain('/account/orders');
      // The orders page renders a filter form, not a heading
      await expect(
        page.getByRole('group', {name: /filter orders/i}),
      ).toBeVisible();
    });

    test('navigates to profile page', async ({page}) => {
      await page.goto('/account/profile');

      await expect(
        page.getByRole('heading', {level: 2, name: /my profile/i}),
      ).toBeVisible();
    });

    test('navigates to addresses page', async ({page}) => {
      await page.goto('/account/addresses');

      await expect(
        page.getByRole('heading', {level: 2, name: /addresses/i}),
      ).toBeVisible();
    });
  });

  // Logout must run after all auth-dependent blocks because it invalidates
  // the server-side session. Unauthenticated runs last and doesn't need auth.
  test.describe('Logout', () => {
    // Load saved session — bypass header is applied file-level via extraHTTPHeaders
    test.use({storageState: CUSTOMER_ACCOUNT_STORAGE_STATE_PATH});

    test('logs out and shows sign-in link', async ({page, customerAccount}) => {
      await page.goto('/');
      await customerAccount.expectLoggedIn();

      await customerAccount.navigateToAccount();
      await customerAccount.logout();

      await page.goto('/');
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
