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

  async navigateToOrders() {
    await this.page.goto('/account/orders');
    await expect(this.page).toHaveURL(/\/account\/orders/);
  }

  async navigateToProfile() {
    await this.page.goto('/account/profile');
    await expect(this.page).toHaveURL(/\/account\/profile/);
  }

  async navigateToAddresses() {
    await this.page.goto('/account/addresses');
    await expect(this.page).toHaveURL(/\/account\/addresses/);
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

  // ── Authenticated page locators ─────────────────────────

  getWelcomeHeading(firstName: string): Locator {
    return this.page.getByRole('heading', {
      name: new RegExp('Welcome, ' + firstName),
      level: 1,
    });
  }

  getAccountMenuLink(name: string | RegExp): Locator {
    return this.page.getByRole('link', {name});
  }

  getEmptyOrdersMessage(): Locator {
    return this.page.getByText("You haven't placed any orders yet.");
  }

  getStartShoppingLink(): Locator {
    return this.page.getByRole('link', {name: /start shopping/i});
  }

  getFirstNameInput(): Locator {
    return this.page.getByRole('textbox', {name: /first name/i});
  }

  getLastNameInput(): Locator {
    return this.page.getByRole('textbox', {name: /last name/i});
  }

  getPhoneInput(): Locator {
    return this.page.getByLabel(/mobile/i);
  }

  getProfileEmailInput(): Locator {
    return this.page.locator('#email');
  }

  getMarketingCheckbox(): Locator {
    return this.page.getByLabel(/accept marketing/i);
  }

  getNewPasswordInput(): Locator {
    return this.page.getByLabel(/^new password$/i);
  }

  getNewPasswordConfirmInput(): Locator {
    return this.page.getByLabel(/new password confirm/i);
  }

  getLogoutButton(): Locator {
    return this.page.getByRole('button', {name: /logout|sign out/i});
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

  // ── Authenticated page assertions ───────────────────────

  async assertOrdersPageRendered(firstName: string) {
    await expect(this.getWelcomeHeading(firstName)).toBeVisible();
    await expect(this.page.locator('.orders')).toBeVisible();
  }

  async assertEmptyOrders() {
    await expect(this.getEmptyOrdersMessage()).toBeVisible();
    await expect(this.getStartShoppingLink()).toBeVisible();
  }

  async assertProfilePageRendered(customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }) {
    await expect(this.getFirstNameInput()).toHaveValue(customer.firstName);
    await expect(this.getLastNameInput()).toHaveValue(customer.lastName);
    await expect(this.getProfileEmailInput()).toHaveValue(customer.email);
    await expect(this.getPhoneInput()).toHaveValue(customer.phone);
  }

  async assertAddressesPageRendered() {
    await expect(
      this.page.getByRole('heading', {name: /addresses/i}),
    ).toBeVisible();
  }

  async assertAccountMenuLinks() {
    await expect(this.getAccountMenuLink(/orders/i)).toBeVisible();
    await expect(this.getAccountMenuLink(/profile/i)).toBeVisible();
    await expect(this.getAccountMenuLink(/addresses/i)).toBeVisible();
  }
}
