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

    const firstItemPrice = await waitForLoaders(page, () =>
      page.locator('[data-test=subtotal]').textContent(),
    );

    // Add an extra unit by increasing quantity
    await waitForLoaders(page, () =>
      page.locator(`button :text-is("+")`).click({clickCount: 1, delay: 600}),
    );
    await expect(
      page.locator('[data-test=subtotal]'),
      'should double the price',
    ).toContainText(usdFormatter.format(2 * normalizePrice(firstItemPrice)));
    await expect(
      page.locator('[data-test=item-quantity]'),
      'should increase quantity',
    ).toContainText('2');

    // Close cart drawer => Products => First product
    await page.locator('[data-test=close-cart]').click();
    await page.locator(`header nav a:text-is("Products")`).click();
    await page.locator(`[data-test=product-grid] a  >> nth=0`).click();

    // Add another unit by adding to cart the same item
    await waitForLoaders(page, () =>
      page.locator(`[data-test=add-to-cart]`).click(),
    );
    await expect(
      page.locator('[data-test=subtotal]'),
      'should triple the price',
    ).toContainText(formatPrice(3 * normalizePrice(firstItemPrice)));
    const quantities = await page
      .locator('[data-test=item-quantity]')
      .allTextContents();
    await expect(
      quantities.reduce((a, b) => Number(a) + Number(b), 0),
      'should have the correct item quantities',
    ).toEqual(3);

    const priceInStore = await page
      .locator('[data-test=subtotal]')
      .textContent();

    await page.locator('a :text("Checkout")').click();

    await expect(page.url(), 'should navigate to checkout').toMatch(
      /checkout\.hydrogen\.shop\/checkouts\/[\d\w]+/,
    );

    const priceInCheckout = await page
      .locator('[role=cell] > span')
      .getByText(/^\$\d/)
      .textContent();

    await expect(
      normalizePrice(priceInCheckout),
      'should show the same price in checkout',
    ).toEqual(normalizePrice(priceInStore));
  });
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatPrice(price: string | number) {
  return usdFormatter.format(Number(price));
}

function normalizePrice(price: string | null) {
  if (!price) throw new Error('Price was not found');

  return Number(
    price
      .replace('$', '')
      .trim()
      .replace(/[.,](\d\d)$/, '-$1')
      .replace(/[.,]/g, '')
      .replace('-', '.'),
  );
}
