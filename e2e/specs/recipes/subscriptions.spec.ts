import {test, expect, setRecipeFixture} from '../../fixtures';
import {CartUtil} from '../../fixtures/cart-utils';
import {KNOWN_SKELETON_PRODUCT as KNOWN_REGULAR_PRODUCT} from '../../fixtures/known-products';

setRecipeFixture({
  recipeName: 'subscriptions',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Subscriptions recipe, which enables selling subscription-based
 * products using selling plan groups from the Shopify Subscriptions app.
 *
 * Auth-required flows (account subscriptions management, cancellation) are
 * covered in subscriptions-auth.spec.ts.
 */

const KNOWN_SUBSCRIPTION_PRODUCT = {
  handle: 'shopify-wax',
  name: 'Shopify Wax (Subscription)',
} as const;

test.describe('Subscriptions Recipe', () => {
  test.describe('Product Page - Subscription Product', () => {
    test.beforeEach(async ({page}) => {
      await page.goto(`/products/${KNOWN_SUBSCRIPTION_PRODUCT.handle}`);
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: KNOWN_SUBSCRIPTION_PRODUCT.name,
        }),
      ).toBeVisible();
    });

    test('displays selling plan selector with subscription options', async ({
      page,
    }) => {
      await expect(
        page.getByRole('heading', {level: 3, name: 'Subscription Options'}),
      ).toBeVisible();

      const deliveryOption = page
        .getByRole('link')
        .filter({hasText: /deliver every/i});
      await expect(deliveryOption.first()).toBeVisible();

      const optionCount = await deliveryOption.count();
      expect(optionCount).toBeGreaterThan(1);
    });

    test('displays subscription frequency options with links', async ({
      page,
    }) => {
      const monthlyOption = page.getByRole('link', {
        name: /deliver every month/i,
      });
      await expect(monthlyOption).toBeVisible();

      const weeklyOption = page.getByRole('link', {
        name: /deliver every week/i,
      });
      await expect(weeklyOption).toBeVisible();

      await weeklyOption.click();

      await expect
        .poll(() => new URL(page.url()).searchParams.get('selling_plan'))
        .toBeTruthy();
    });

    test('allows switching between subscription frequencies', async ({
      page,
    }) => {
      const monthlyOption = page.getByRole('link', {
        name: /deliver every month/i,
      });
      const weeklyOption = page.getByRole('link', {
        name: /deliver every week/i,
      });

      await monthlyOption.click();

      await expect
        .poll(() => {
          const sellingPlan = new URL(page.url()).searchParams.get(
            'selling_plan',
          );
          return sellingPlan !== null;
        })
        .toBe(true);
      const monthlySellingPlan = new URL(page.url()).searchParams.get(
        'selling_plan',
      );

      await weeklyOption.click();

      await expect
        .poll(() => {
          const sellingPlan = new URL(page.url()).searchParams.get(
            'selling_plan',
          );
          return sellingPlan !== null && sellingPlan !== monthlySellingPlan;
        })
        .toBe(true);
      const weeklySellingPlan = new URL(page.url()).searchParams.get(
        'selling_plan',
      );

      expect(weeklySellingPlan).not.toBe(monthlySellingPlan);

      await monthlyOption.click();

      await expect
        .poll(() => new URL(page.url()).searchParams.get('selling_plan'))
        .toBe(monthlySellingPlan);
    });
  });

  test.describe('Cart - Subscription Product', () => {
    test('displays subscription details in cart line item', async ({page}) => {
      const cart = new CartUtil(page);

      await page.goto(`/products/${KNOWN_SUBSCRIPTION_PRODUCT.handle}`);

      const weeklyOption = page.getByRole('link', {
        name: /deliver every week/i,
      });
      await weeklyOption.click();

      await expect
        .poll(() => new URL(page.url()).searchParams.get('selling_plan'))
        .toBeTruthy();

      const subscribeButton = page.getByRole('button', {name: 'Subscribe'});
      await subscribeButton.click();

      await expect(page.getByRole('dialog', {name: 'Cart'})).toBeVisible();

      const lineItems = cart.getLineItems();
      await expect(lineItems).toHaveCount(1);

      // The recipe renders sellingPlanAllocation.sellingPlan.name in a <small> element
      const firstLineItem = lineItems.first();
      await expect(
        firstLineItem.getByText(/deliver every week/i),
      ).toBeVisible();
    });
  });

  test.describe('Product Page - Regular Product', () => {
    test('does not display subscription options on non-subscription products', async ({
      page,
    }) => {
      await page.goto(`/products/${KNOWN_REGULAR_PRODUCT.handle}`);
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: KNOWN_REGULAR_PRODUCT.name,
        }),
      ).toBeVisible();

      await expect(
        page.getByRole('heading', {level: 3, name: 'Subscription Options'}),
      ).toHaveCount(0);

      const deliveryOption = page
        .getByRole('link')
        .filter({hasText: /deliver every/i});
      await expect(deliveryOption).toHaveCount(0);
    });
  });
});
