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

test.describe('Collection Flow', () => {
  test('should navigate to collection and verify product grid renders correctly', async ({
    page,
  }) => {
    const {collection} = createPageObjects(page, serverUrl);

    // Navigate to a collection page
    // Using 'all' as the collection handle since it's commonly available in mock data
    await collection.navigateToCollection('all');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Verify we're on the collection page
    await expect(page).toHaveURL(/\/collections\//);

    // Verify collection title is visible
    const collectionTitle = await collection.collectionTitle.textContent();
    expect(collectionTitle).toBeTruthy();
    expect(collectionTitle?.length).toBeGreaterThan(0);

    // Verify product grid is visible
    await expect(collection.productGrid).toBeVisible();

    // Verify there are products in the grid
    const productCount = await collection.getProductCount();
    expect(productCount).toBeGreaterThan(0);

    // Verify each product has a title and price
    const productTitles = await collection.getProductTitles();
    const productPrices = await collection.getProductPrices();

    expect(productTitles.length).toBeGreaterThan(0);
    expect(productPrices.length).toBeGreaterThan(0);

    // Verify all product titles are non-empty
    productTitles.forEach((title) => {
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    // Verify all product prices contain dollar sign
    productPrices.forEach((price) => {
      expect(price).toContain('$');
    });

    // Test navigation to a product from collection
    await collection.clickProduct(0);

    // Verify we navigated to a product page
    await expect(page).toHaveURL(/\/products\//);
  });

  test('should handle different collection handles', async ({page}) => {
    const {collection} = createPageObjects(page, serverUrl);

    // Test navigation to different collections
    // These are common collection handles in Shopify mock data
    const collectionHandles = ['all', 'frontpage', 'automated-collection'];

    for (const handle of collectionHandles) {
      await collection.navigateToCollection(handle);
      await page.waitForLoadState('networkidle');

      // Check if we get a 404 or if the collection exists
      const responseCode = page.url().includes('404') ? 404 : 200;

      if (responseCode === 200) {
        // If collection exists, verify it has products
        const productCount = await collection.getProductCount();
        console.log(`Collection '${handle}' has ${productCount} products`);

        // At least one collection should have products
        if (handle === 'all') {
          expect(productCount).toBeGreaterThan(0);
        }
      }
    }
  });
});
