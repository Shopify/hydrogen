import {setTestStore, test, expect, getRequiredSecret} from '../../fixtures';

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

test.beforeEach(async ({page, cart}) => {
  await page.goto('/');

  const productLink = page.getByRole('link', {name: PRODUCT_NAME});
  await expect(productLink).toBeVisible();
  await productLink.click();
  await expect(page).toHaveURL(/\/products\//);

  const addToCartButton = page.getByRole('button', {name: /add to cart/i});
  await expect(addToCartButton).toBeVisible();
  await addToCartButton.click();
  await expect(page.getByRole('dialog', {name: /cart/i})).toBeVisible();
  await cart.closeCartAside();
  await cart.navigateToCartPage();
});

test.describe('Discount codes', () => {
  test('Applies and displays discount code', async ({discount}) => {
    await discount.applyCode(ACTIVE_DISCOUNT_CODE);
    await discount.assertAppliedCode(ACTIVE_DISCOUNT_CODE);
  });

  test('Applies discount and reduces subtotal', async ({cart, discount}) => {
    await cart.assertSubtotal(UNIT_PRICE);

    await discount.applyCode(ACTIVE_DISCOUNT_CODE);

    await cart.assertSubtotal(DISCOUNTED_PRICE);
  });

  test('Applies discount via URL', async ({page, cart, discount}) => {
    await page.goto(`/discount/${ACTIVE_DISCOUNT_CODE}`);
    await expect(page).toHaveURL('/');

    await cart.navigateToCartPage();

    await discount.assertAppliedCode(ACTIVE_DISCOUNT_CODE);
  });

  test('Removes discount code', async ({discount}) => {
    await discount.applyCode(ACTIVE_DISCOUNT_CODE);
    await discount.assertAppliedCode(ACTIVE_DISCOUNT_CODE);

    await discount.removeCode();

    await discount.assertNoDiscounts();
  });

  test('Persists discount after page reload', async ({page, discount}) => {
    await discount.applyCode(ACTIVE_DISCOUNT_CODE);
    await discount.assertAppliedCode(ACTIVE_DISCOUNT_CODE);

    await page.reload();

    await discount.assertAppliedCode(ACTIVE_DISCOUNT_CODE);
  });

  test('Shows discount input in cart', async ({page}) => {
    await expect(
      page.getByRole('textbox', {name: 'Discount code'}),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {name: 'Apply discount code'}),
    ).toBeVisible();
  });

  test('Handles case-insensitive codes', async ({discount}) => {
    const lowercaseCode = ACTIVE_DISCOUNT_CODE.toLowerCase();
    await discount.applyCode(lowercaseCode);
    await discount.assertAppliedCode(ACTIVE_DISCOUNT_CODE);

    await discount.removeCode();

    const uppercaseCode = ACTIVE_DISCOUNT_CODE.toUpperCase();
    await discount.applyCode(uppercaseCode);
    await discount.assertAppliedCode(ACTIVE_DISCOUNT_CODE);
  });

  test('Rejects invalid discount code', async ({discount}) => {
    await discount.applyCode(INACTIVE_DISCOUNT_CODE);

    await discount.assertNoDiscounts();
  });

  test('Handles empty code submission', async ({discount}) => {
    await discount.applyCode('');
    await discount.assertNoDiscounts();
  });

  test('Prevents duplicate discount codes', async ({page, discount}) => {
    await discount.applyCode(ACTIVE_DISCOUNT_CODE);
    await discount.assertAppliedCode(ACTIVE_DISCOUNT_CODE);

    await discount.applyCode(ACTIVE_DISCOUNT_CODE);

    const discounts = page.getByLabel('Discounts');
    await expect(discounts.getByRole('group')).toHaveCount(1);
  });
});
