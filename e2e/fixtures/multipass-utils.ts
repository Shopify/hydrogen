import {expect, Page} from '@playwright/test';

export class MultipassUtil {
  constructor(private page: Page) {}

  // ── Navigation ──────────────────────────────────────────────

  async navigateToRegister() {
    await this.page.goto('/account/register');
    await expect(this.page).toHaveURL(/\/account\/register/);
  }

  async navigateToRecover() {
    await this.page.goto('/account/recover');
    await expect(this.page).toHaveURL(/\/account\/recover/);
  }

  async navigateToReset(id: string, resetToken: string) {
    await this.page.goto(`/account/reset/${id}/${resetToken}`);
    await expect(this.page).toHaveURL(
      new RegExp(`/account/reset/${id}/${resetToken}`),
    );
  }

  async navigateToActivate(id: string, activationToken: string) {
    await this.page.goto(`/account/activate/${id}/${activationToken}`);
    await expect(this.page).toHaveURL(
      new RegExp(`/account/activate/${id}/${activationToken}`),
    );
  }

  // ── Locators ────────────────────────────────────────────────

  getPageHeading(name: string | RegExp) {
    return this.page.getByRole('heading', {level: 1, name});
  }

  getEmailInput() {
    return this.page.getByRole('textbox', {name: /email address/i});
  }

  getPasswordInput() {
    return this.page.getByLabel('Password', {exact: true});
  }

  getPasswordConfirmInput() {
    return this.page.getByLabel(/re-enter password/i);
  }

  getSubmitButton(name: string | RegExp) {
    return this.page.getByRole('button', {name});
  }

  getLink(name: string | RegExp) {
    return this.page.getByRole('link', {name});
  }

  getHeaderAccountLink() {
    return this.page
      .getByRole('banner')
      .getByRole('link', {name: /sign in|account/i});
  }

  getCheckoutButton() {
    return this.page.getByRole('button', {name: /continue to checkout/i});
  }

  // ── Assertions ──────────────────────────────────────────────

  async assertRegisterPageRendered() {
    await expect(this.getPageHeading('Register.')).toBeVisible();
    await expect(this.getEmailInput()).toBeVisible();
    await expect(this.getPasswordInput()).toBeVisible();
    await expect(this.getPasswordConfirmInput()).toBeVisible();
    await expect(this.getSubmitButton('Register')).toBeVisible();
  }

  async assertRegisterPageLinks() {
    await expect(this.getLink(/login/i)).toBeVisible();
  }

  async assertRecoverPageRendered() {
    await expect(this.getPageHeading('Forgot Password.')).toBeVisible();
    await expect(this.getEmailInput()).toBeVisible();
    await expect(this.getSubmitButton('Request Reset Link')).toBeVisible();
  }

  async assertRecoverPageLinks() {
    await expect(this.getLink(/login/i)).toBeVisible();
  }

  async assertResetPageRendered() {
    await expect(this.getPageHeading('Reset Password.')).toBeVisible();
    await expect(this.getPasswordInput()).toBeVisible();
    await expect(this.getPasswordConfirmInput()).toBeVisible();
    await expect(this.getSubmitButton('Reset')).toBeVisible();
  }

  async assertResetPageLinks() {
    await expect(this.getLink(/back to login/i)).toBeVisible();
  }

  async assertActivatePageRendered() {
    await expect(this.getPageHeading('Activate Account.')).toBeVisible();
    await expect(this.getPasswordInput()).toBeVisible();
    await expect(this.getPasswordConfirmInput()).toBeVisible();
    await expect(this.getSubmitButton('Save')).toBeVisible();
  }

  async assertHeaderHasAccountLink() {
    await expect(this.getHeaderAccountLink()).toBeVisible();
  }
}
