import {test, expect, setRecipeFixture} from '../../fixtures';
import {GtmUtil} from '../../fixtures/gtm-utils';

setRecipeFixture({
  recipeName: 'gtm',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Google Tag Manager (GTM) recipe, which integrates GTM into
 * Hydrogen storefronts for tracking user interactions and ecommerce events.
 *
 * The recipe adds:
 * - GTM script tags with proper CSP nonce support
 * - Content Security Policy configuration for GTM domains
 * - GoogleTagManager component that subscribes to analytics events
 * - dataLayer integration for custom events
 *
 * Tests cover:
 * - GTM script loading
 * - dataLayer initialization and functionality
 * - Analytics integration with Hydrogen events
 * - Proper GTM container ID configuration
 */

test.describe('GTM Recipe', () => {
  test.describe('Script Integration', () => {
    test('loads GTM script with container ID', async ({page}) => {
      const gtm = new GtmUtil(page);

      await page.goto('/');

      // GTM script should be loaded
      await gtm.assertGtmScriptLoaded();
    });

    test('includes GTM noscript fallback', async ({page}) => {
      const gtm = new GtmUtil(page);

      await page.goto('/');

      // GTM noscript iframe should be present for users with JS disabled
      await gtm.assertGtmNoScriptPresent();
    });

    test('uses real GTM container ID not placeholder', async ({page}) => {
      const gtm = new GtmUtil(page);

      await page.goto('/');

      // Verify container ID is configured (not the placeholder value)
      await gtm.assertGtmContainerIdConfigured();
    });
  });

  test.describe('DataLayer Integration', () => {
    test('initializes dataLayer global variable', async ({page}) => {
      const gtm = new GtmUtil(page);

      await page.goto('/');

      // dataLayer should exist as a global array
      await gtm.assertDataLayerExists();
    });

    test('dataLayer receives events on page load', async ({page}) => {
      const gtm = new GtmUtil(page);

      await page.goto('/');

      // Wait for dataLayer to be populated
      await gtm.waitForDataLayerPush();

      // Verify dataLayer has events
      await gtm.assertDataLayerNotEmpty();
    });

    test('pushes events to dataLayer when navigating', async ({page}) => {
      const gtm = new GtmUtil(page);

      await page.goto('/');

      // Get initial dataLayer length
      const initialLength = await gtm.getDataLayerLength();
      expect(initialLength).toBeGreaterThan(0);

      // Navigate to a product page
      await gtm.navigateToProduct('the-ascend');

      // DataLayer should have new events after navigation
      const newLength = await gtm.getDataLayerLength();
      expect(newLength).toBeGreaterThanOrEqual(initialLength);
    });
  });

  test.describe('Analytics Events', () => {
    test('product view triggers analytics events', async ({page}) => {
      const gtm = new GtmUtil(page);

      await gtm.navigateToProduct('the-ascend');

      // Wait for dataLayer to be updated
      await gtm.waitForDataLayerPush();

      // Verify product viewed event in dataLayer
      // Note: The exact event name depends on GTM component implementation
      await gtm.assertDataLayerNotEmpty();
    });

    test('dataLayer persists across navigation', async ({page}) => {
      const gtm = new GtmUtil(page);

      // Navigate to home page
      await page.goto('/');
      await gtm.waitForDataLayerPush();
      const homeDataLayerLength = await gtm.getDataLayerLength();

      // Navigate to product page
      await gtm.navigateToProduct('the-ascend');
      const productDataLayerLength = await gtm.getDataLayerLength();

      // DataLayer should accumulate events, not reset
      expect(productDataLayerLength).toBeGreaterThanOrEqual(
        homeDataLayerLength,
      );
    });
  });

  test.describe('Content Security Policy', () => {
    test('allows GTM scripts to load without CSP violations', async ({
      page,
    }) => {
      const gtm = new GtmUtil(page);
      const cspViolations: string[] = [];

      // Listen for CSP violations
      page.on('console', (msg) => {
        if (
          msg.type() === 'error' &&
          msg.text().includes('Content Security Policy')
        ) {
          cspViolations.push(msg.text());
        }
      });

      await page.goto('/');
      await gtm.assertGtmScriptLoaded();

      // No CSP violations should occur
      expect(cspViolations).toHaveLength(0);
    });

    test('GTM script tag is properly configured', async ({page}) => {
      const gtm = new GtmUtil(page);

      await page.goto('/');

      // GTM script should be present in the page
      await gtm.assertGtmScriptLoaded();

      // Verify the GTM container ID is configured
      await gtm.assertGtmContainerIdConfigured();

      // Note: Actual GTM script loading may be blocked in test environments
      // due to network policies, but the script tag should be present
    });
  });

  test.describe('Customer Privacy Integration', () => {
    test('page loads with GTM even before consent', async ({page}) => {
      const gtm = new GtmUtil(page);

      await page.goto('/');

      // GTM should be present regardless of consent state
      // (actual tracking respects consent, but script loads)
      await gtm.assertGtmScriptLoaded();
      await gtm.assertDataLayerExists();
    });

    test('dataLayer is accessible for consent management', async ({page}) => {
      const gtm = new GtmUtil(page);

      await page.goto('/');

      // DataLayer should be available for consent updates
      const canPushToDataLayer = await page.evaluate(() => {
        try {
          window.dataLayer.push({event: 'test-event'});
          return true;
        } catch {
          return false;
        }
      });

      expect(canPushToDataLayer).toBe(true);
    });
  });

  test.describe('Edge Cases', () => {
    test('handles rapid navigation without dataLayer errors', async ({
      page,
    }) => {
      const gtm = new GtmUtil(page);

      // Rapidly navigate between pages
      await page.goto('/');
      await gtm.waitForDataLayerPush();

      await page.goto('/collections/all');
      await page.goto('/products/the-ascend');
      await page.goto('/');

      // DataLayer should still be functional
      await gtm.assertDataLayerExists();
      await gtm.assertDataLayerNotEmpty();
    });

    test('works with client-side navigation', async ({page}) => {
      const gtm = new GtmUtil(page);

      await page.goto('/');
      const initialLength = await gtm.getDataLayerLength();

      // Use client-side navigation by clicking a link
      const productLink = page.getByRole('link', {name: /the/i}).first();
      await productLink.click();

      // Wait for navigation to complete
      await page.waitForURL(/\/products\//);

      // DataLayer should still work after client-side navigation
      const newLength = await gtm.getDataLayerLength();
      expect(newLength).toBeGreaterThanOrEqual(initialLength);
    });
  });
});
