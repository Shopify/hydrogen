import {expect, Page} from '@playwright/test';

const CART_ID_PREFIX = 'gid://shopify/Cart/';

export class CartUtil {
  constructor(private page: Page) {}

  async assertInCart(productName: string) {
    const lineItems = this.page.getByLabel('Line items');
    await expect(
      lineItems.getByRole('listitem').filter({hasText: productName}),
    ).toBeVisible();
  }

  async assertSubtotal(formattedAmount: string) {
    const cartTotals = this.page.getByLabel('Totals');
    const subtotal = cartTotals
      .getByRole('group')
      .filter({hasText: 'Subtotal'});
    await expect(
      subtotal.getByRole('definition').filter({hasText: formattedAmount}),
    ).toBeVisible();
  }

  async assertProductCount(count: number) {
    await expect(
      this.page.getByLabel('Line items').locator('> li:visible'),
    ).toHaveCount(count);
  }

  async assertTotalItems(itemCount: number) {
    await expect(
      this.page
        .getByRole('link', {name: 'Cart'})
        .getByLabel(`(items: ${itemCount})`),
    ).toBeVisible();
  }

  async setCartId(cartId: string, baseURL?: string) {
    const value = cartId.startsWith(CART_ID_PREFIX)
      ? cartId.replace(CART_ID_PREFIX, '')
      : cartId;
    const url = baseURL || new URL(this.page.url()).origin;
    await this.page.context().addCookies([
      {
        name: 'cart',
        value: encodeURIComponent(value),
        url,
        httpOnly: false,
        secure: false,
      },
    ]);
  }

  async navigateToCartPage(expectLineItems: boolean = true) {
    await this.page.waitForLoadState('networkidle');
    await this.page.goto('/cart');
    await expect(
      this.page.getByRole('dialog', {name: /cart/i}),
    ).not.toBeVisible();
    if (expectLineItems) {
      const lineItems = this.page
        .getByLabel('Line items')
        .locator('> li:visible');
      await expect(lineItems.first()).toBeVisible();
    }
  }

  async closeCartAside() {
    const closeButton = this.page
      .getByRole('dialog', {name: /cart/i})
      .getByRole('button', {name: 'Close'});
    await closeButton.click();
    await expect(
      this.page.getByRole('dialog', {name: /cart/i}),
    ).not.toBeVisible();
  }
}
