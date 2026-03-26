import {
  test,
  expect,
  setRecipeFixture,
  MSW_SCENARIOS,
  B2B_COMPANY_NAME,
} from '../../fixtures';

setRecipeFixture({
  recipeName: 'b2b',
  storeKey: 'hydrogenPreviewStorefront',
  mock: {
    scenario: MSW_SCENARIOS.b2bLoggedIn,
  },
});

/**
 * B2B Recipe E2E Tests
 *
 * Tests the B2B commerce recipe which adds:
 * - Company location selector modal for B2B customers
 * - Quantity rules (min, max, increment) on product pages
 * - Volume pricing (price breaks) on product pages
 * - Buyer-contextualized product queries
 *
 * All Customer Account API calls are mocked via MSW. The mock scenario
 * provides a B2B customer with two company locations (Headquarters, Warehouse).
 * Storefront API calls go to the real hydrogenPreviewStorefront.
 *
 * NOTE: Quantity rules and volume pricing tables are only visible when
 * products have B2B-specific data (configured in Shopify admin on a Plus plan).
 * The hydrogenPreviewStorefront products don't have B2B attributes,
 * so we verify the components render correctly when data is absent
 * (conditional rendering doesn't break the page).
 */

test.describe('B2B Recipe', () => {
  test.describe('Location Selector', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/');
    });

    test('shows location modal on first visit for B2B customer with multiple locations', async ({
      page,
      b2b,
    }) => {
      await b2b.assertLocationModalVisible(B2B_COMPANY_NAME);
    });

    test('displays all company locations with addresses', async ({
      page,
      b2b,
    }) => {
      await b2b.assertLocationModalVisible(B2B_COMPANY_NAME);

      const locationButtons = b2b.getLocationButtons();
      await expect(locationButtons).toHaveCount(2);

      await expect(b2b.getLocationButton('Headquarters')).toBeVisible();
      await expect(b2b.getLocationButton('Warehouse')).toBeVisible();

      await expect(page.getByText('123 Main St')).toBeVisible();
      await expect(page.getByText('456 Industrial Ave')).toBeVisible();
    });

    test('closes modal after selecting a location', async ({page, b2b}) => {
      await b2b.assertLocationModalVisible(B2B_COMPANY_NAME);
      await b2b.selectLocation(B2B_COMPANY_NAME, 'Headquarters');
    });

    test('shows change location button in header after selection', async ({
      page,
      b2b,
    }) => {
      await b2b.assertLocationModalVisible(B2B_COMPANY_NAME);
      await b2b.selectLocation(B2B_COMPANY_NAME, 'Headquarters');

      await expect(b2b.getChangeLocationButton('Headquarters')).toBeVisible();
    });

    test('reopens modal when change location button is clicked', async ({
      page,
      b2b,
    }) => {
      await b2b.assertLocationModalVisible(B2B_COMPANY_NAME);
      await b2b.selectLocation(B2B_COMPANY_NAME, 'Headquarters');

      const changeButton = b2b.getChangeLocationButton('Headquarters');
      await changeButton.click();

      await b2b.assertLocationModalVisible(B2B_COMPANY_NAME);
    });

    test('switches location and updates header button', async ({page, b2b}) => {
      await b2b.assertLocationModalVisible(B2B_COMPANY_NAME);
      await b2b.selectLocation(B2B_COMPANY_NAME, 'Headquarters');
      await expect(b2b.getChangeLocationButton('Headquarters')).toBeVisible();

      await b2b.getChangeLocationButton('Headquarters').click();
      await b2b.assertLocationModalVisible(B2B_COMPANY_NAME);
      await b2b.selectLocation(B2B_COMPANY_NAME, 'Warehouse');
      await expect(b2b.getChangeLocationButton('Warehouse')).toBeVisible();
    });
  });

  test.describe('Product Page with B2B Context', () => {
    test.beforeEach(async ({page, b2b}) => {
      await page.goto('/');
      await b2b.assertLocationModalVisible(B2B_COMPANY_NAME);
      await b2b.selectLocation(B2B_COMPANY_NAME, 'Headquarters');
    });

    test('product page loads and renders add-to-cart button', async ({
      page,
      storefront,
    }) => {
      await storefront.goto('/');
      await storefront.navigateToFirstProduct();

      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      await expect(
        page.getByRole('button', {name: 'Add to cart'}),
      ).toBeVisible();
    });

    test('product page does not show quantity rules for standard products', async ({
      page,
      storefront,
      b2b,
    }) => {
      await storefront.goto('/');
      await storefront.navigateToFirstProduct();

      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      await b2b.assertQuantityRulesHidden();
      await b2b.assertVolumePricingHidden();
    });
  });
});
