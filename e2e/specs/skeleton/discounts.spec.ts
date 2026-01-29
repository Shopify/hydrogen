import {setTestStore, test, expect, getRequiredSecret} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

const activeDiscountCode = getRequiredSecret(
  'discount_code_active',
).toUpperCase();
const inactiveDiscountCode = getRequiredSecret(
  'discount_code_inactive',
).toUpperCase();

test.beforeEach(async ({storefront, context}) => {
  await context.clearCookies();
  await storefront.goto('/');
  await storefront.navigateToFirstProduct();
  await storefront.addToCart();
  await storefront.navigateToCart();
});

test.describe('Discount codes', () => {
  test('Applies and displays discount code', async ({storefront}) => {
    const discount = await storefront.applyDiscountCode(activeDiscountCode);

    const appliedCodes = await storefront.getAppliedDiscountCodes();
    expect(appliedCodes).toHaveLength(1);
    expect(appliedCodes[0]).toBe(discount.code);
  });

  test('Applies discount and reduces subtotal', async ({storefront}) => {
    // Discount code is $10 off
    const subtotalBefore = await storefront.getCartSubtotal();

    await storefront.applyDiscountCode(activeDiscountCode);

    const subtotalAfter = await storefront.getCartSubtotal();
    expect(subtotalAfter).toBeLessThan(subtotalBefore);
    expect(subtotalBefore - subtotalAfter).toBe(10);
  });

  test('Applies discount via URL', async ({storefront}) => {
    await storefront.goto(`/discount/${activeDiscountCode}`);
    await storefront.page.waitForLoadState('networkidle');

    await expect(storefront.page).toHaveURL('/');

    await storefront.navigateToCart();

    const appliedCodes = await storefront.getAppliedDiscountCodes();
    expect(appliedCodes).toContain(activeDiscountCode);
  });

  test('Removes discount code', async ({storefront}) => {
    await storefront.applyDiscountCode(activeDiscountCode);

    let appliedCodes = await storefront.getAppliedDiscountCodes();
    expect(appliedCodes).toHaveLength(1);

    await storefront.removeDiscountCode();

    appliedCodes = await storefront.getAppliedDiscountCodes();
    expect(appliedCodes).toHaveLength(0);
  });

  test('Persists discount after page reload', async ({storefront}) => {
    const discount = await storefront.applyDiscountCode(activeDiscountCode);
    await storefront.expectDiscountCodeApplied(discount.code);

    await storefront.reload();

    await storefront.expectDiscountCodeApplied(discount.code);
  });

  test('Shows discount input in cart', async ({storefront}) => {
    const discountInput = storefront.page.locator(
      'input[name="discountCode"]:visible',
    );
    await expect(discountInput).toBeVisible({timeout: 10000});

    const applyButton = discountInput
      .locator('..')
      .getByRole('button', {name: 'Apply discount code'});
    await expect(applyButton).toBeVisible();
  });

  test('Handles case-insensitive codes', async ({storefront}) => {
    const lowercaseCode = activeDiscountCode.toLowerCase();
    let discount = await storefront.applyDiscountCode(lowercaseCode);

    await storefront.expectDiscountCodeApplied(discount.code);

    await storefront.removeDiscountCode();

    const uppercaseCode = activeDiscountCode.toUpperCase();
    discount = await storefront.applyDiscountCode(uppercaseCode);

    await storefront.expectDiscountCodeApplied(discount.code);
  });

  test('Rejects invalid discount code', async ({storefront}) => {
    await storefront.tryApplyDiscountCode(inactiveDiscountCode);

    const appliedCodes = await storefront.getAppliedDiscountCodes();
    expect(appliedCodes).not.toContain(inactiveDiscountCode);
  });

  test('Handles empty code submission', async ({storefront}) => {
    const appliedCodesBefore = await storefront.getAppliedDiscountCodes();

    await storefront.tryApplyDiscountCode('');

    const appliedCodesAfter = await storefront.getAppliedDiscountCodes();
    expect(appliedCodesAfter).toEqual(appliedCodesBefore);
  });

  test('Prevents duplicate discount codes', async ({storefront}) => {
    const discount = await storefront.applyDiscountCode(activeDiscountCode);

    await storefront.tryApplyDiscountCode(activeDiscountCode);

    const appliedCodes = await storefront.getAppliedDiscountCodes();
    expect(appliedCodes).toHaveLength(1);
    expect(appliedCodes[0]).toBe(discount.code);
  });
});
