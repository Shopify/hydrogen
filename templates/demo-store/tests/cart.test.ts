import {test, expect} from '@playwright/test';

import {
  formatPrice,
  normalizePrice,
  createNetworkWatcher,
  type NetworkWatcher,
} from './utils';

test.describe('Cart', () => {
  let network: NetworkWatcher;

  test.beforeEach(({page}) => {
    network = createNetworkWatcher(page);
  });

  test.afterEach(() => {
    network.stop();
  });

  test('From home to checkout flow', async ({page}) => {
    // Home => Collections => First collection => First product
    await page.goto(`/`);
    await page.locator(`header nav a:text-is("Collections")`).click();
    await page.locator(`[data-test=collection-grid] a  >> nth=0`).click();
    await page.locator(`[data-test=product-grid] a  >> nth=0`).click();
    await page.locator(`[data-test=add-to-cart]`).click();

    // Wait for the cart to update before reading subtotal
    await network.settled();
    const firstItemPrice = await page
      .locator('[data-test=subtotal]')
      .textContent();

    // Add an extra unit by increasing quantity
    await page
      .locator(`button :text-is("+")`)
      .click({clickCount: 1, delay: 600});

    // Wait for the cart to update before reading subtotal
    await network.settled();
    await expect(
      page.locator('[data-test=subtotal]'),
      'should double the price',
    ).toContainText(formatPrice(2 * normalizePrice(firstItemPrice)));

    await expect(
      page.locator('[data-test=item-quantity]'),
      'should increase quantity',
    ).toContainText('2');

    // Close cart drawer => Products => First product
    await page.locator('[data-test=close-cart]').click();
    await page.locator(`header nav a:text-is("Products")`).click();
    await page.locator(`[data-test=product-grid] a  >> nth=0`).click();

    // Add another unit by adding to cart the same item
    await page.locator(`[data-test=add-to-cart]`).click();

    // Wait for the cart to update before reading subtotal
    await network.settled();
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
