import {expect, Locator, Page} from '@playwright/test';

const CART_ID_PREFIX = 'gid://shopify/Cart/';

export class CartUtil {
  constructor(private page: Page) {}

  async getOptionSelectors(lineItem: Locator) {
    const optionSelectors = lineItem.getByRole('combobox');
    await expect(optionSelectors.first()).toBeVisible();
    return optionSelectors;
  }

  async selectDifferentOption(optionSelect: Locator) {
    const optionName = await optionSelect.getAttribute('name');
    expect(optionName).toBeTruthy();

    const initialValue = await optionSelect.inputValue();
    const enabledOptionValues = await optionSelect.evaluate((element) => {
      const selectElement = element as HTMLSelectElement;
      return Array.from(selectElement.options)
        .filter((option) => !option.disabled && option.value.trim() !== '')
        .map((option) => option.value);
    });

    expect(enabledOptionValues.length).toBeGreaterThan(1);

    const nextValue = enabledOptionValues.find(
      (value) => value !== initialValue,
    );
    expect(nextValue).toBeTruthy();

    if (!optionName || !nextValue) {
      throw new Error(
        'Expected cart line option select with at least two values',
      );
    }

    await optionSelect.selectOption(nextValue);
    await expect.poll(async () => optionSelect.inputValue()).toBe(nextValue);

    return {optionName, nextValue};
  }

  async addItem(productName: string) {
    await expect(
      this.page.getByRole('heading', {level: 1, name: productName}),
    ).toBeVisible();
    const addToCartButton = this.page.getByRole('button', {
      name: 'Add to cart',
    });
    await addToCartButton.click();
    await expect(this.page.getByRole('dialog', {name: 'Cart'})).toBeVisible();
    const removeButton = this.getLineItems()
      .filter({hasText: productName})
      .getByRole('button', {name: 'Remove'});
    await expect(removeButton).toBeEnabled();
  }

  async assertInCart(productName: string) {
    await expect(
      this.getLineItems().filter({hasText: productName}),
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

  async assertSubtotalCurrencyFormat(currencyFormat: RegExp) {
    const {isCartPage, scope} = this.getActiveCartContext();

    if (isCartPage) {
      const cartHeading = this.page.getByRole('heading', {
        name: /cart/i,
        level: 1,
      });
      await expect(cartHeading).toBeVisible();
    }

    const cartTotals = scope.getByLabel('Totals');
    const subtotal = cartTotals
      .getByRole('group')
      .filter({hasText: 'Subtotal'});
    await expect(
      subtotal.getByRole('definition').filter({hasText: currencyFormat}),
    ).toBeVisible();
  }

  async assertProductCount(count: number) {
    await expect(this.getLineItems()).toHaveCount(count);
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

  async navigateToCartPage() {
    await this.page.goto('/cart');
    await expect(
      this.page.getByRole('dialog', {name: 'Cart'}),
    ).not.toBeVisible();
  }

  async closeCartAside() {
    const closeButton = this.page
      .getByRole('dialog', {name: 'Cart'})
      .getByRole('button', {name: 'Close'});
    await closeButton.click();
    await expect(
      this.page.getByRole('dialog', {name: 'Cart'}),
    ).not.toBeVisible();
  }

  /**
   * The skeleton template renders both cart page and drawer simultaneously,
   * with the drawer hidden via CSS. Auto-detection ensures we select from the
   * correct context to avoid matching duplicate line items.
   */
  getLineItems() {
    const {scope} = this.getActiveCartContext();
    const lineItemsList = scope.getByLabel('Line items');

    return lineItemsList.locator('> li');
  }

  private getActiveCartContext() {
    const isCartPage = this.page.url().includes('/cart');
    const scope = isCartPage
      ? this.page.getByLabel('Cart page')
      : this.page.getByRole('dialog', {name: 'Cart'});

    return {isCartPage, scope};
  }

  getIncreaseButton(lineItem: Locator) {
    return lineItem.getByRole('button', {name: 'Increase quantity'});
  }

  getDecreaseButton(lineItem: Locator) {
    return lineItem.getByRole('button', {name: 'Decrease quantity'});
  }

  getRemoveButton(lineItem: Locator) {
    return lineItem.getByRole('button', {name: 'Remove'});
  }
}
