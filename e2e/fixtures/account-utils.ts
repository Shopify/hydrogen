import {expect, Locator, Page} from '@playwright/test';

const ACCOUNT_URL_PATTERN = /\/account(?:\/orders)?$/;

export class AccountUtil {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/account');
  }

  async assertLoggedInState(firstName: string) {
    await expect(this.page).toHaveURL(ACCOUNT_URL_PATTERN);
    await expect(this.getWelcomeHeading(firstName)).toBeVisible();
    await expect(this.getOrderSearchForm()).toBeVisible();
    await expect(this.getEmptyOrdersMessage()).toBeVisible();
  }

  async expectLoggedInState(firstName: string) {
    await this.assertLoggedInState(firstName);
  }

  getWelcomeHeading(firstName: string): Locator {
    return this.page.getByRole('heading', {
      level: 1,
      name: `Welcome, ${firstName}`,
    });
  }

  getOrderSearchForm(): Locator {
    return this.page.getByRole('form', {name: 'Search orders'});
  }

  getEmptyOrdersMessage(): Locator {
    return this.page.getByText("You haven't placed any orders yet.");
  }
}
