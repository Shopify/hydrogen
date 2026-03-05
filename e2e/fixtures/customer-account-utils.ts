import type {Page} from '@playwright/test';
import {expect} from '@playwright/test';

const LOADTEST_HEADER = '<ADD THE LOADTEST HEADER HERE>';

const DEFAULT_OTP = '000000';

/**
 * Fixture for E2E testing customer account flows (login, logout, auth state).
 *
 * Requires:
 * - A benchmark shop with Customer Account API enabled
 * - The dev server started with `--customer-account-push` (tunnel)
 * - A test customer whose email ends in `@example.com`
 *
 * The benchmark shop bypass allows OTP to be `000000` when the loadtest
 * header is present and the email ends in `@example.com`.
 */
export class CustomerAccountUtil {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Set the loadtest bypass header so Shopify's auth service accepts
   * the fixed OTP code (000000) for benchmark shops.
   */
  async enableLoadtestBypass() {
    await this.page.setExtraHTTPHeaders({
      [LOADTEST_HEADER]: 'true',
    });
  }

  /**
   * Full login flow: navigate to sign-in, interact with Shopify's hosted
   * login page, enter email + OTP, and wait for redirect back to the store.
   *
   * @param email - Test customer email (must end in @example.com)
   * @param otp - OTP code (defaults to 000000 for benchmark shops)
   */
  async login(email: string, otp: string = DEFAULT_OTP) {
    await this.enableLoadtestBypass();

    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');

    const signInLink = this.page
      .getByRole('navigation')
      .getByRole('link', {name: /sign in/i});
    await expect(signInLink).toBeVisible({timeout: 10000});
    await signInLink.click();

    // The login route redirects to Shopify's hosted login page
    await this.page.waitForURL(/shopify\.com/, {timeout: 30000});
    await this.page.waitForLoadState('networkidle');

    // Enter email on the hosted login page
    const emailInput = this.page.getByRole('textbox', {name: /email/i});
    await expect(emailInput).toBeVisible({timeout: 15000});
    await emailInput.fill(email);

    const continueButton = this.page.getByRole('button', {
      name: /continue/i,
    });
    await expect(continueButton).toBeVisible();
    await continueButton.click();

    // Wait for the OTP entry page to load
    await this.page.waitForLoadState('networkidle');

    // Enter OTP digits — Shopify's login may use individual digit inputs
    // or a single input field. Try the single input first, then fall back
    // to individual digit inputs.
    const singleOtpInput = this.page.locator(
      'input[autocomplete="one-time-code"], input[type="tel"][maxlength="6"], input[name*="otp"], input[name*="code"]',
    );

    if (
      await singleOtpInput
        .first()
        .isVisible({timeout: 5000})
        .catch(() => false)
    ) {
      await singleOtpInput.first().fill(otp);
    } else {
      // Individual digit inputs (6 separate fields)
      const digitInputs = this.page.locator(
        'input[type="tel"][maxlength="1"], input[inputmode="numeric"][maxlength="1"]',
      );
      const count = await digitInputs.count();
      if (count >= 6) {
        for (let i = 0; i < 6; i++) {
          await digitInputs.nth(i).fill(otp[i]);
        }
      } else {
        // Last resort: look for any visible text/number input on the page
        const fallbackInput = this.page
          .locator('input:visible')
          .filter({hasNot: this.page.locator('[type="hidden"]')});
        await fallbackInput.first().fill(otp);
      }
    }

    // Submit OTP if there's a submit button
    const submitButton = this.page.getByRole('button', {
      name: /verify|submit|continue|log in|sign in/i,
    });
    if (
      await submitButton
        .first()
        .isVisible({timeout: 3000})
        .catch(() => false)
    ) {
      await submitButton.first().click();
    }

    // Wait for redirect back to the store's /account page
    await this.page.waitForURL(/\/account/, {timeout: 30000});
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Log out by submitting the sign-out form on the account page.
   */
  async logout() {
    const signOutButton = this.page.getByRole('button', {name: /sign out/i});
    await expect(signOutButton).toBeVisible({timeout: 10000});
    await signOutButton.click();

    // Logout redirects through Shopify and back to the store
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Assert the user is logged in by checking the header shows "Account".
   */
  async expectLoggedIn() {
    const accountLink = this.page
      .getByRole('navigation')
      .getByRole('link', {name: /^account$/i});
    await expect(accountLink).toBeVisible({timeout: 10000});
  }

  /**
   * Assert the user is logged out by checking the header shows "Sign in".
   */
  async expectLoggedOut() {
    const signInLink = this.page
      .getByRole('navigation')
      .getByRole('link', {name: /sign in/i});
    await expect(signInLink).toBeVisible({timeout: 10000});
  }

  /**
   * Navigate to the account page and wait for load.
   */
  async navigateToAccount() {
    await this.page.goto('/account');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the h1 heading text on the account page.
   */
  async getAccountHeading(): Promise<string | null> {
    const heading = this.page.getByRole('heading', {level: 1});
    await expect(heading).toBeVisible({timeout: 10000});
    return heading.textContent();
  }

  /**
   * Assert that the account page shows a welcome heading.
   */
  async expectAccountPageVisible() {
    const heading = await this.getAccountHeading();
    expect(heading).toMatch(/welcome/i);
  }

  /**
   * Assert that account navigation links are visible.
   */
  async expectAccountNavVisible() {
    const nav = this.page.locator('nav[role="navigation"]');
    await expect(nav.getByRole('link', {name: /orders/i})).toBeVisible();
    await expect(nav.getByRole('link', {name: /profile/i})).toBeVisible();
    await expect(nav.getByRole('link', {name: /addresses/i})).toBeVisible();
  }
}
