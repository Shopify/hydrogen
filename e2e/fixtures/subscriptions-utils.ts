import {expect, Locator, Page} from '@playwright/test';

/**
 * Subscriptions-specific test utilities for the Subscriptions recipe.
 * Covers the account subscriptions management page (auth-required flows).
 */
export class SubscriptionsUtil {
  constructor(private page: Page) {}

  // -- Account: Subscriptions management page --

  async navigateToSubscriptions() {
    await this.page.goto('/account/subscriptions');
  }

  getSubscriptionsHeading(): Locator {
    return this.page.getByRole('heading', {name: 'My subscriptions'});
  }

  getSubscriptionRows(): Locator {
    return this.page
      .getByRole('list', {name: 'Subscriptions'})
      .getByRole('listitem');
  }

  getStatusBadgeByText(status: string): Locator {
    return this.page.getByText(status, {exact: true});
  }

  getCancelButton(subscriptionRow: Locator): Locator {
    return subscriptionRow.getByRole('button', {name: 'Cancel subscription'});
  }

  getDiscountLabels(subscriptionRow: Locator): Locator {
    return subscriptionRow.getByText(/\d+% off|\$[\d.]+ off/);
  }

  async assertSubscriptionsPageLoaded() {
    await expect(this.getSubscriptionsHeading()).toBeVisible();
  }

  // -- Account navigation --

  getSubscriptionsNavLink(): Locator {
    return this.page.getByRole('link', {name: 'Subscriptions'});
  }

  async assertSubscriptionsLinkInAccountMenu() {
    await expect(this.getSubscriptionsNavLink()).toBeVisible();
  }
}
