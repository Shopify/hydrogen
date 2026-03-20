import type {Page} from '@playwright/test';
import {expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import nodePath from 'node:path';

const DEFAULT_OTP = '000000';

/**
 * Fixture for E2E testing customer account flows (login, logout, auth state).
 *
 * Requires:
 * - A benchmark shop with Customer Account API enabled
 * - Either a dev server with `--customer-account-push` (tunnel) or an Oxygen deployment URL
 * - A test customer whose email ends in `@example.com`
 *
 * The benchmark shop bypass allows OTP to be `000000` when the loadtest
 * header is present and the email ends in `@example.com`. The loadtest
 * header (loaded from `secrets.ejson` at runtime) is set globally via
 * `playwright.config.ts` `extraHTTPHeaders`, not per-request in this fixture.
 */
export class CustomerAccountUtil {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Full login flow: navigate to sign-in, interact with Shopify's hosted
   * login page, enter email + OTP, and wait for redirect back to the store.
   *
   * @param email - Test customer email (must end in @example.com)
   * @param otp - OTP code (defaults to 000000 for benchmark shops)
   */
  async login(email: string, otp: string = DEFAULT_OTP) {
    await this.page.goto('/');

    const signInLink = this.page.getByRole('link', {name: 'Sign in'});
    await expect(signInLink).toBeVisible({timeout: 10000});
    await signInLink.click();

    // The login route redirects to Shopify's hosted login page
    await this.page.waitForURL(/shopify\.com/, {timeout: 30000});

    // Enter email on the hosted login page
    const emailInput = this.page.getByRole('textbox', {name: 'Email'});
    await expect(emailInput).toBeVisible({timeout: 15000});
    await emailInput.fill(email);

    const continueButton = this.page.getByRole('button', {
      name: 'Continue',
      exact: true,
    });
    await expect(continueButton).toBeVisible();
    await continueButton.click();

    // Enter OTP digits — Shopify's login currently uses a single combined input.
    // The regex matches several possible accessible name patterns to be
    // resilient against label changes on the hosted login page we don't control.
    const singleOtpInput = this.page.getByRole('textbox', {
      name: /digit.*code|verification.*code|otp/i,
    });
    await singleOtpInput.first().fill(otp);

    // Submit OTP if there's a submit button
    const submitButton = this.page.getByRole('button', {
      name: 'Submit',
      exact: true,
    });

    if (
      await submitButton
        .first()
        .isVisible({timeout: 3000})
        .catch(() => false)
    ) {
      await submitButton.first().click();
    }

    // Detect OTP errors before waiting for redirect — if the bypass isn't
    // configured correctly, the page shows an error and the redirect never comes.
    // Shopify's login page always renders an empty [role="alert"] live region,
    // so we filter to only match elements that actually contain error text.
    const otpError = this.page
      .locator('[role="alert"]')
      .filter({hasText: /.+/});
    if (await otpError.isVisible({timeout: 3000}).catch(() => false)) {
      throw new Error(
        'OTP submission failed — check if bypass is configured correctly',
      );
    }

    // Wait until we've left Shopify's hosted login and redirected back to the store
    const redirectBackTimeoutInMs = 30_000;
    await this.page.waitForURL((url) => !url.hostname.includes('shopify.com'), {
      timeout: redirectBackTimeoutInMs,
    });
  }

  /**
   * Log out by submitting the sign-out form on the account page.
   */
  async logout() {
    const signOutButton = this.page.getByRole('button', {name: /sign out/i});
    await expect(signOutButton).toBeVisible({timeout: 10000});
    await signOutButton.click();

    // The logout redirect chain goes: store → shopify.com → store.
    // Wait until we've left the /account path and returned to the store,
    // so the server-side session is fully invalidated before callers navigate.
    const logoutRedirectTimeoutInMs = 30_000;
    await this.page.waitForURL(
      (url) =>
        !url.hostname.includes('shopify.com') &&
        !url.pathname.startsWith('/account'),
      {timeout: logoutRedirectTimeoutInMs},
    );
  }

  /**
   * Serialize cookies and localStorage to disk so subsequent tests can
   * skip the full OAuth flow by loading this file via `test.use({ storageState })`.
   */
  async saveStorageState(filePath: string): Promise<void> {
    await mkdir(nodePath.dirname(filePath), {recursive: true});
    await this.page.context().storageState({path: filePath});
  }

  /**
   * Assert the user is logged in by checking the header shows "Account".
   */
  async expectLoggedIn() {
    const accountLink = this.page
      .getByRole('navigation')
      .getByRole('link', {name: 'Account', exact: true});
    await expect(accountLink).toBeVisible({timeout: 10000});
  }

  /**
   * Assert the user is logged out by checking the header shows "Sign in".
   */
  async expectLoggedOut() {
    const signInLink = this.page.getByRole('link', {name: /sign in/i});

    // The logout redirect chain (store → shopify.com → store) may not
    // have fully cleared the session, so reload and poll until it settles.
    await expect
      .poll(
        async () => {
          await this.page.goto('/');
          await this.page.waitForLoadState('domcontentloaded');
          return signInLink.isVisible().catch(() => false);
        },
        {timeout: 30000, intervals: [5000]},
      )
      .toBe(true);
  }

  /**
   * Navigate to the account page and wait for the welcome heading to confirm
   * the page loaded successfully (not a redirect or error state).
   */
  async navigateToAccount() {
    await this.page.goto('/account');
    await this.expectAccountPageVisible();
  }

  /**
   * Assert that the account page shows a welcome heading.
   */
  async expectAccountPageVisible() {
    const heading = this.page.getByRole('heading', {name: /welcome/i});
    await expect(heading).toBeVisible({timeout: 10000});
  }

  /**
   * Assert that account navigation links are visible.
   */
  async expectAccountNavVisible() {
    const nav = this.page.getByRole('navigation');
    await expect(nav.getByRole('link', {name: /orders/i})).toBeVisible();
    await expect(nav.getByRole('link', {name: /profile/i})).toBeVisible();
    await expect(nav.getByRole('link', {name: /addresses/i})).toBeVisible();
  }
}
