import {expect, Page} from '@playwright/test';

const CART_ID_PREFIX = 'gid://shopify/Cart/';

export const cart = {
  assertInCart: async (page: Page, productName: string) => {
    const lineItems = page.getByLabel('Line items');
    await expect(
      lineItems.getByRole('listitem').filter({hasText: productName}),
    ).toBeVisible();
  },
  assertSubtotal: async (page: Page, formattedAmount: string) => {
    const cartTotals = page.getByLabel('Totals');
    const subtotal = cartTotals
      .getByRole('group')
      .filter({hasText: 'Subtotal'});
    await expect(
      subtotal.getByRole('definition').filter({hasText: formattedAmount}),
    ).toBeVisible();
  },
  assertProductCount: async (page: Page, count: number) => {
    // :visible excludes hidden drawer/page; > li counts only top-level products
    await expect(
      page.getByLabel('Line items').locator('> li:visible'),
    ).toHaveCount(count);
  },
  assertTotalItems: async (page: Page, itemCount: number) => {
    await expect(
      page
        .getByRole('link', {name: 'Cart'})
        .getByLabel(`(items: ${itemCount})`),
    ).toBeVisible();
  },
  setCartId: async (page: Page, cartId: string) => {
    const value = cartId.startsWith(CART_ID_PREFIX)
      ? cartId.replace(CART_ID_PREFIX, '')
      : cartId;
    await page.context().addCookies([
      {
        name: 'cart',
        value: encodeURIComponent(value),
        url: page.url(),
        httpOnly: false,
        secure: false,
      },
    ]);
  },
  navigateToCartPage: async (page: Page) => {
    // Wait for any in-flight cart mutations to complete before navigation.
    // Without this, the cart page may fetch stale data and appear empty.
    await page.waitForLoadState('networkidle');
    await page.goto('/cart');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    const lineItems = page.getByLabel('Line items').locator('> li:visible');
    await expect(lineItems.first()).toBeVisible();
  },
  closeCartAside: async (page: Page) => {
    const closeButton = page
      .getByRole('dialog')
      .getByRole('button', {name: 'Close'});
    await closeButton.click();
  },
};

export const discount = {
  applyCode: async (page: Page, code: string) => {
    const input = page.getByRole('textbox', {name: 'Discount code'});
    await input.fill(code);
    await page.getByRole('button', {name: 'Apply discount code'}).click();
  },
  assertAppliedCode: async (page: Page, code: string) => {
    const discounts = page.getByLabel('Discount(s)');
    await expect(
      discounts.getByRole('group').filter({hasText: code}),
    ).toBeVisible();
  },
  removeCode: async (page: Page) => {
    await page.getByRole('button', {name: 'Remove discount'}).click();
  },
  assertNoDiscounts: async (page: Page) => {
    const discounts = page.locator('main:visible').getByLabel('Discount(s)');
    await expect(discounts.getByRole('group')).not.toBeVisible();
  },
};
