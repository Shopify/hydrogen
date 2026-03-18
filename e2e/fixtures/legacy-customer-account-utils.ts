import {expect, type Locator, type Page} from '@playwright/test';

/**
 * Test utilities for the legacy-customer-account-flow recipe.
 * Provides helpers for navigating auth pages and asserting page structure
 * in the legacy Storefront API auth flow.
 */
export class LegacyCustomerAccountUtil {
  constructor(private page: Page) {}

  // ── Navigation ──────────────────────────────────────────

  async navigateToLogin() {
    await this.page.goto('/account/login');
    await expect(this.page).toHaveURL(/\/account\/login/);
  }

  async navigateToRegister() {
    await this.page.goto('/account/register');
    await expect(this.page).toHaveURL(/\/account\/register/);
  }

  async navigateToRecover() {
    await this.page.goto('/account/recover');
    await expect(this.page).toHaveURL(/\/account\/recover/);
  }

  // ── Page element locators ───────────────────────────────

  getPageHeading(): Locator {
    return this.page.getByRole('heading', {level: 1});
  }

  getEmailInput(): Locator {
    return this.page.getByRole('textbox', {name: /email address/i});
  }

  getPasswordInput(): Locator {
    return this.page.getByLabel('Password', {exact: true});
  }

  getPasswordConfirmInput(): Locator {
    return this.page.getByLabel(/re-enter password/i);
  }

  getSubmitButton(name: string | RegExp): Locator {
    return this.page.getByRole('button', {name});
  }

  getLink(name: string | RegExp): Locator {
    return this.page.getByRole('link', {name});
  }

  // ── Login page assertions ───────────────────────────────

  async assertLoginPageRendered() {
    await expect(this.getPageHeading()).toHaveText('Sign in.');
    await expect(this.getEmailInput()).toBeVisible();
    await expect(this.getPasswordInput()).toBeVisible();
    await expect(this.getSubmitButton('Sign in')).toBeVisible();
  }

  async assertLoginPageLinks() {
    await expect(this.getLink(/forgot password/i)).toBeVisible();
    await expect(this.getLink(/register/i)).toBeVisible();
  }

  // ── Register page assertions ────────────────────────────

  async assertRegisterPageRendered() {
    await expect(this.getPageHeading()).toHaveText('Register.');
    await expect(this.getEmailInput()).toBeVisible();
    await expect(this.getPasswordInput()).toBeVisible();
    await expect(this.getPasswordConfirmInput()).toBeVisible();
    await expect(this.getSubmitButton('Register')).toBeVisible();
  }

  async assertRegisterPageLinks() {
    await expect(this.getLink(/login/i)).toBeVisible();
  }

  // ── Recover page assertions ─────────────────────────────

  async assertRecoverPageRendered() {
    await expect(this.getPageHeading()).toHaveText('Forgot Password.');
    await expect(this.getEmailInput()).toBeVisible();
    await expect(this.getSubmitButton(/request reset link/i)).toBeVisible();
  }

  async assertRecoverPageLinks() {
    await expect(this.getLink(/login/i)).toBeVisible();
  }

  // ── Header assertions ──────────────────────────────────

  getHeaderAccountLink(): Locator {
    return this.page
      .getByRole('banner')
      .getByRole('link', {name: /sign in|account/i});
  }

  async assertHeaderHasAccountLink() {
    await expect(this.getHeaderAccountLink()).toBeVisible();
  }
}
