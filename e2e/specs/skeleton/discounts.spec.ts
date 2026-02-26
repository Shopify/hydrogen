import {setTestStore, test, expect, getRequiredSecret} from '../../fixtures';
import {cart, discount} from '../../fixtures/test-utils';

setTestStore('hydrogenPreviewStorefront');

const ACTIVE_DISCOUNT_CODE = getRequiredSecret(
  'discount_code_active',
).toUpperCase();
const INACTIVE_DISCOUNT_CODE = getRequiredSecret(
  'discount_code_inactive',
).toUpperCase();
const PRODUCT_NAME = 'The Element';
const UNIT_PRICE = '$749.95';
const DISCOUNTED_PRICE = '$739.95';

test.beforeEach(async ({page}) => {
  await page.goto('/');

  const productLink = page.getByRole('link', {name: PRODUCT_NAME});
  const addToCartButton = page.getByRole('button', {name: 'Add to cart'});
  const cartDialog = page.getByRole('dialog');

  await productLink.click();
  await addToCartButton.click();
  await expect(cartDialog).toBeVisible();
  await cart.closeCartAside(page);
  await cart.navigateToCartPage(page);
});

test.describe('Discount codes', () => {
  test('Applies and displays discount code', async ({page}) => {
    await discount.applyCode(page, ACTIVE_DISCOUNT_CODE);
    await discount.assertAppliedCode(page, ACTIVE_DISCOUNT_CODE);
  });

  test('Applies discount and reduces subtotal', async ({page}) => {
    await cart.assertSubtotal(page, UNIT_PRICE);

    await discount.applyCode(page, ACTIVE_DISCOUNT_CODE);

    await cart.assertSubtotal(page, DISCOUNTED_PRICE);
  });

  test('Applies discount via URL', async ({page}) => {
    await page.goto(`/discount/${ACTIVE_DISCOUNT_CODE}`);
    await expect(page).toHaveURL('/');

    await cart.navigateToCartPage(page);

    await discount.assertAppliedCode(page, ACTIVE_DISCOUNT_CODE);
  });

  test('Removes discount code', async ({page}) => {
    await discount.applyCode(page, ACTIVE_DISCOUNT_CODE);
    await discount.assertAppliedCode(page, ACTIVE_DISCOUNT_CODE);

    await discount.removeCode(page);

    await discount.assertNoDiscounts(page);
  });

  test('Persists discount after page reload', async ({page}) => {
    await discount.applyCode(page, ACTIVE_DISCOUNT_CODE);
    await discount.assertAppliedCode(page, ACTIVE_DISCOUNT_CODE);

    await page.reload();

    await discount.assertAppliedCode(page, ACTIVE_DISCOUNT_CODE);
  });

  test('Shows discount input in cart', async ({page}) => {
    await expect(
      page.getByRole('textbox', {name: 'Discount code'}),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {name: 'Apply discount code'}),
    ).toBeVisible();
  });

  test('Handles case-insensitive codes', async ({page}) => {
    const lowercaseCode = ACTIVE_DISCOUNT_CODE.toLowerCase();
    await discount.applyCode(page, lowercaseCode);
    await discount.assertAppliedCode(page, ACTIVE_DISCOUNT_CODE);

    await discount.removeCode(page);

    const uppercaseCode = ACTIVE_DISCOUNT_CODE.toUpperCase();
    await discount.applyCode(page, uppercaseCode);
    await discount.assertAppliedCode(page, ACTIVE_DISCOUNT_CODE);
  });

  test('Rejects invalid discount code', async ({page}) => {
    await discount.applyCode(page, INACTIVE_DISCOUNT_CODE);

    await discount.assertNoDiscounts(page);
  });

  test('Handles empty code submission', async ({page}) => {
    await discount.applyCode(page, '');
    await discount.assertNoDiscounts(page);
  });

  test('Prevents duplicate discount codes', async ({page}) => {
    await discount.applyCode(page, ACTIVE_DISCOUNT_CODE);
    await discount.assertAppliedCode(page, ACTIVE_DISCOUNT_CODE);

    await discount.applyCode(page, ACTIVE_DISCOUNT_CODE);

    const discounts = page.getByLabel('Discount(s)');
    await expect(discounts.getByRole('group')).toHaveCount(1);
  });
});
