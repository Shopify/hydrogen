import {test, expect, setRecipeFixture} from '../../fixtures';
import {CartUtil} from '../../fixtures/cart-utils';

setRecipeFixture({
  recipeName: 'subscriptions',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Subscriptions recipe, which enables selling subscription-based
 * products using selling plan groups from the Shopify Subscriptions app.
 *
 * Tests cover:
 * - Selling plan selector display on product pages
 * - Subscription frequency options with links
 * - Subscription selection and cart integration
 * - Subscription details in cart line items
 *
 * TODO: Add tests for /account/subscriptions management page (requires customer authentication).
 */

const KNOWN_SUBSCRIPTION_PRODUCT = {
  handle: 'shopify-wax',
  name: 'Shopify Wax (Subscription)',
} as const;

const KNOWN_REGULAR_PRODUCT = {
  handle: 'the-ascend',
  name: 'The Ascend',
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

    test('allows selecting subscription and adding to cart', async ({page}) => {
      const weeklyOption = page.getByRole('link', {
        name: /deliver every week/i,
      });
      await weeklyOption.click();

      await expect
        .poll(() => new URL(page.url()).searchParams.get('selling_plan'))
        .toBeTruthy();

      const addToCartButton = page.getByRole('button', {
        name: /add to cart/i,
      });
      await addToCartButton.click();

      await expect(page.getByRole('dialog', {name: 'Cart'})).toBeVisible();
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

      const addToCartButton = page.getByRole('button', {
        name: /add to cart/i,
      });
      await addToCartButton.click();

      await expect(page.getByRole('dialog', {name: 'Cart'})).toBeVisible();

      const lineItems = cart.getLineItems();
      await expect(lineItems).toHaveCount(1);

      // Recipe currently only shows "(subscription)" marker in cart
      // TODO: Enhance recipe to display selling plan details (e.g., "Deliver every week")
      const firstLineItem = lineItems.first();
      await expect(firstLineItem.getByText(/subscription/i)).toBeVisible();
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
