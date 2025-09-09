import {test, expect} from '@playwright/test';
import {startServer} from '../helpers/server';
import {createPageObjects} from '../page-objects/storefront';

let serverUrl: string;
let stopServer: () => Promise<void>;

test.beforeAll(async () => {
  const server = await startServer();
  serverUrl = `http://localhost:${server.port}`;
  stopServer = server.stop;
}, 90000);

test.afterAll(async () => {
  if (stopServer) {
    await stopServer();
  }
});

test.describe('Product Flow', () => {
  test('should navigate to product, display correct title and price, and add to cart', async ({
    page,
  }) => {
    const {product} = createPageObjects(page, serverUrl);

    // Navigate to first product
    await product.navigateToFirstProduct();

    // Assert product title is visible and not empty
    const productTitle = await product.getProductTitle();
    expect(productTitle).toBeTruthy();
    expect(productTitle.length).toBeGreaterThan(0);

    // Assert product price is visible and formatted correctly
    await expect(product.productPrice.first()).toBeVisible();
    const priceText = await product.getProductPrice();
    expect(priceText).toMatch(/\$[\d,]+\.?\d*/); // Matches prices like $50, $50.00, $1,000.50

    // Click Add to Cart button
    await expect(product.addToCartButton).toBeVisible();
    await product.addToCart();

    // Verify cart action succeeded (cart should open or show some indication)
    const isCartDrawerVisible = await product.isCartDrawerOpen();
    const cartCount = await product.getCartCount();

    // Assert that either cart drawer opened or cart count updated
    if (!isCartDrawerVisible) {
      // If drawer didn't open, check that cart count updated
      expect(cartCount).toBeGreaterThanOrEqual(1);
    } else {
      // Cart drawer is open
      expect(isCartDrawerVisible).toBe(true);
    }
  });
});
