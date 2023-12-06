import {test, expect} from '@playwright/test';

import {waitForLoaders} from './utils';

test.describe('Cart', () => {
  test('From home to checkout flow', async ({page}) => {
    // Home => Collections => First collection => First product
    await page.goto(`/`);
    await page.locator(`header nav a:text-is("Collections")`).click();
    await page.locator(`[data-test=collection-grid] a  >> nth=0`).click();
    await page.locator(`[data-test=product-grid] a  >> nth=0`).click();
    await page.locator(`[data-test=add-to-cart]`).click();

    await waitForLoaders(page, () =>
      page.locator(`button :text-is("+")`).click({clickCount: 1, delay: 600}),
    );

    await expect(
      page.locator('[data-test=item-quantity]'),
      'should increase quantity',
    ).toContainText('2');

    // Close cart drawer => Products => First product
    await page.locator('[data-test=close-cart]').click();
    await page.locator(`header nav a:text-is("Products")`).click();
    await page.locator(`[data-test=product-grid] a  >> nth=0`).click();

    await waitForLoaders(page, () =>
      page.locator(`[data-test=add-to-cart]`).click(),
    );

    const quantities = await page
      .locator('[data-test=item-quantity]')
      .allTextContents();

    await expect(
      quantities.reduce((a, b) => a + Number(b), 0),
      'should have the correct item quantities',
    ).toEqual(3);

    const priceInStore = await page
      .locator('[data-test=subtotal]')
      .textContent();

    await page.locator('a :text("Checkout")').click();

    await expect(page.url(), 'should navigate to checkout').toMatch(
      /[\w\d-]+\.myshopify\.com\/\d+\/checkouts\/[\d\w]+/,
    );

    const priceInCheckout = await page
      .locator('[data-checkout-subtotal-price-target]')
      .textContent();

    await expect(
      normalizePrice(priceInCheckout),
      'should show the same price in checkout',
    ).toEqual(normalizePrice(priceInStore));
  });
});

function normalizePrice(price: string | null) {
  if (!price) throw new Error('Price was not found');

  return price
    .replace('$', '')
    .trim()
    .replace(/[.,](\d\d)$/, '-$1')
    .replace(/[.,]/g, '')
    .replace('-', '.');
}
