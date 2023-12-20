import {test, expect} from '@playwright/test';

import {formatPrice, normalizePrice} from './utils';

test.describe('Cart', () => {
  test('From home to checkout flow', async ({page}) => {
    // Home => Collections => First collection => First product
    await page.goto(`/`);
    await page.locator(`header nav a:text-is("Collections")`).click();
    await page.locator(`[data-test=collection-grid] a  >> nth=0`).click();
    await page.locator(`[data-test=product-grid] a  >> nth=0`).click();

    const firstItemPrice = normalizePrice(
      await page.locator(`[data-test=price]`).textContent(),
    );

    await page.locator(`[data-test=add-to-cart]`).click();

    await expect(
      page.locator('[data-test=subtotal]'),
      'should show the correct price',
    ).toContainText(formatPrice(firstItemPrice));

    // Add an extra unit by increasing quantity
    await page
      .locator(`button :text-is("+")`)
      .click({clickCount: 1, delay: 600});

    await expect(
      page.locator('[data-test=subtotal]'),
      'should double the price',
    ).toContainText(formatPrice(2 * firstItemPrice));

    await expect(
      page.locator('[data-test=item-quantity]'),
      'should increase quantity',
    ).toContainText('2');

    // Close cart drawer => Products => First product
    await page.locator('[data-test=close-cart]').click();
    await page.locator(`header nav a:text-is("Products")`).click();
    await page.locator(`[data-test=product-grid] a  >> nth=0`).click();

    const secondItemPrice = normalizePrice(
      await page.locator(`[data-test=price]`).textContent(),
    );

    // Add another unit by adding to cart the same item
    await page.locator(`[data-test=add-to-cart]`).click();

    await expect(
      page.locator('[data-test=subtotal]'),
      'should add the price of the second item',
    ).toContainText(formatPrice(2 * firstItemPrice + secondItemPrice));

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
