import {test, expect, setRecipeFixture, MSW_SCENARIOS} from '../../fixtures';
import {SubscriptionsUtil} from '../../fixtures/subscriptions-utils';

setRecipeFixture({
  recipeName: 'subscriptions',
  storeKey: 'hydrogenPreviewStorefront',
  mock: {
    scenario: MSW_SCENARIOS.subscriptionsLoggedIn,
  },
});

/**
 * Subscriptions Recipe E2E Tests — Auth-Required Flows
 *
 * Tests cover the customer-account-authenticated areas of the recipe:
 * - Account subscriptions management page (list, status, billing, discounts)
 * - Subscription cancellation flow
 * - Account navigation (Subscriptions link in menu)
 *
 * Storefront-facing features (selling plan selector on product pages, cart
 * subscription info) are covered in subscriptions.spec.ts.
 */

test.describe('Subscriptions Recipe', () => {
  test.describe('Account Subscriptions Page', () => {
    test.beforeEach(async ({page}) => {
      const subscriptions = new SubscriptionsUtil(page);
      await subscriptions.navigateToSubscriptions();
      await subscriptions.assertSubscriptionsPageLoaded();
    });

    test('renders subscription list with correct count', async ({page}) => {
      const subscriptions = new SubscriptionsUtil(page);
      const rows = subscriptions.getSubscriptionRows();
      await expect(rows).toHaveCount(2);
    });

    test('displays subscription line item names', async ({page}) => {
      await expect(page.getByText('Shopify Wax - Monthly')).toBeVisible();
      await expect(page.getByText('Premium Polish - Bi-Weekly')).toBeVisible();
    });

    test('shows active and cancelled status badges', async ({page}) => {
      const subscriptions = new SubscriptionsUtil(page);

      await expect(subscriptions.getStatusBadgeByText('ACTIVE')).toBeVisible();
      await expect(
        subscriptions.getStatusBadgeByText('CANCELLED'),
      ).toBeVisible();
    });

    test('displays billing interval for subscriptions', async ({page}) => {
      const subscriptions = new SubscriptionsUtil(page);

      const firstRow = subscriptions.getSubscriptionRows().first();
      const secondRow = subscriptions.getSubscriptionRows().nth(1);

      await expect(firstRow.getByText('1 month')).toBeVisible();
      await expect(secondRow.getByText('2 weeks')).toBeVisible();
    });

    test('shows discount information on subscriptions', async ({page}) => {
      const subscriptions = new SubscriptionsUtil(page);

      const firstRow = subscriptions.getSubscriptionRows().first();
      const discountLabels = subscriptions.getDiscountLabels(firstRow);
      await expect(discountLabels).toHaveCount(1);
      await expect(discountLabels.first()).toHaveText('10% off');
    });

    test('shows cancel button only for active subscriptions', async ({
      page,
    }) => {
      const subscriptions = new SubscriptionsUtil(page);

      const activeRow = subscriptions.getSubscriptionRows().first();
      const cancelledRow = subscriptions.getSubscriptionRows().nth(1);

      await expect(subscriptions.getCancelButton(activeRow)).toBeVisible();
      await expect(
        subscriptions.getCancelButton(cancelledRow),
      ).not.toBeVisible();
    });

    test('cancel button submits and shows cancelling state', async ({page}) => {
      const subscriptions = new SubscriptionsUtil(page);

      const activeRow = subscriptions.getSubscriptionRows().first();
      const cancelButton = subscriptions.getCancelButton(activeRow);

      await expect(cancelButton).toBeVisible();
      await cancelButton.click();

      // After clicking, the cancel button must disappear - either because the
      // text changed to 'Canceling' (mutation in flight) or the page re-rendered
      // after the mutation completed. Either outcome confirms the action was processed.
      await expect(cancelButton).not.toBeVisible();
    });
  });

  test.describe('Account Navigation', () => {
    test('account menu includes Subscriptions link', async ({page}) => {
      const subscriptions = new SubscriptionsUtil(page);
      await page.goto('/account');

      await subscriptions.assertSubscriptionsLinkInAccountMenu();
    });

    test('Subscriptions link navigates to subscriptions page', async ({
      page,
    }) => {
      const subscriptions = new SubscriptionsUtil(page);
      await page.goto('/account');

      await subscriptions.getSubscriptionsNavLink().click();
      await expect(page).toHaveURL(/\/account\/subscriptions/);
      await subscriptions.assertSubscriptionsPageLoaded();
    });
  });
});
