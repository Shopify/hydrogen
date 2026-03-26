import {test, expect, setRecipeFixture} from '../../fixtures';

setRecipeFixture({
  recipeName: 'metaobjects',
  storeKey: 'hydrogenPreviewStorefront',
});

/**
 * Validates the Metaobjects recipe, which implements a content management system
 * using Shopify metaobjects for dynamic route-based content rendering.
 *
 * Tests cover:
 * - RouteContent component renders metaobject sections
 * - Section type switching logic (hero, products, collections, stores, store profile)
 * - Dynamic route handling for store listings and individual stores
 * - Fallback behavior when routes have no sections
 * - EditRoute component for development/preview environments
 * - Navigation between store routes
 */

function getStoreLinks(page: import('@playwright/test').Page) {
  return page
    .getByRole('region', {name: 'Stores'})
    .getByRole('link')
    .filter({has: page.locator('address')});
}

test.describe('Metaobjects Recipe', () => {
  test.describe('Homepage', () => {
    test('renders route content with metaobject sections', async ({page}) => {
      await page.goto('/');

      await expect(page.getByRole('banner')).toBeVisible();

      await expect(
        page.getByText('No route content sections'),
      ).not.toBeVisible();

      const sections = page.getByRole('region', {name: 'Route Content'});
      await expect(sections).toBeVisible();

      const sectionElements = sections.getByRole('region');
      const sectionCount = await sectionElements.count();
      expect(sectionCount).toBeGreaterThan(0);
    });
  });

  test.describe('Stores Index Route', () => {
    test('renders stores route with metaobject content', async ({page}) => {
      await page.goto('/stores');

      await expect(page).toHaveURL(/\/stores$/);
      await expect(page.getByRole('banner')).toBeVisible();

      await expect(
        page.getByText('No route content sections'),
      ).not.toBeVisible();

      const sections = page.getByRole('region', {name: 'Route Content'});
      await expect(sections).toBeVisible();
    });
  });

  test.describe('Route Fallback', () => {
    test('shows fallback when route has no sections', async ({page}) => {
      await page.goto('/stores/does-not-exist');

      await expect(page).toHaveURL(/\/stores\/does-not-exist$/);

      await expect(page.getByText('No route content sections')).toBeVisible();

      await expect(
        page.getByRole('region', {name: 'Route Content'}),
      ).toHaveCount(0);
    });
  });

  test.describe('Individual Store Navigation', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/stores');
    });

    test('navigates to store detail and back', async ({page}) => {
      const storeLinks = getStoreLinks(page);

      await storeLinks.first().click();
      await expect(page).toHaveURL(/\/stores\/.+$/);

      const backLink = page.getByRole('link', {name: 'Back to Stores'});
      await expect(backLink).toBeVisible();
      await backLink.click();
      await expect(page).toHaveURL(/\/stores$/);
    });

    test('renders store profile details', async ({page}) => {
      const storeLinks = getStoreLinks(page);

      await storeLinks.first().click();

      await expect(page).toHaveURL(/\/stores\//);

      const storeContent = page.getByRole('region', {name: 'Store Profile'});
      await expect(storeContent).toBeVisible();

      await expect(page.getByRole('heading', {level: 1})).toBeVisible();

      await expect(storeContent.locator('address')).toBeVisible();
    });
  });

  test.describe('Section Components', () => {
    test('renders hero section', async ({page}) => {
      await page.goto('/');

      const heroSection = page.getByRole('region', {name: 'Hero'});
      await expect(heroSection.first()).toBeVisible();

      await expect(
        heroSection.first().getByRole('heading', {level: 1}),
      ).toBeVisible();
    });

    test('renders store grid', async ({page}) => {
      await page.goto('/stores');

      const storesSection = page.getByRole('region', {name: 'Stores'});
      await expect(storesSection).toBeVisible();

      const storeLinks = storesSection.getByRole('link');
      await expect(storeLinks.first()).toBeVisible();

      await expect(storeLinks.first().locator('address')).toBeVisible();
    });
  });

  test.describe('EditRoute Component', () => {
    test('shows edit button in development environments', async ({page}) => {
      await page.goto('/');

      const editButton = page.getByRole('link', {name: 'Edit Route'});
      await expect(editButton).toBeVisible();

      const href = await editButton.getAttribute('href');
      expect(href).toContain('admin.shopify.com');
      expect(href).toContain('/content/entries/route/');

      const target = await editButton.getAttribute('target');
      const rel = await editButton.getAttribute('rel');
      expect(target).toBe('_blank');
      expect(rel).toBe('noreferrer');
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/stores');
    });

    test('store links are keyboard navigable', async ({page}) => {
      const storeLinks = getStoreLinks(page);

      // Tab into the store links region and verify keyboard navigation
      const firstLink = storeLinks.first();
      await firstLink.scrollIntoViewIfNeeded();
      await page.keyboard.press('Tab');

      // Tab until a store link is focused (skip header/nav links)
      const maxTabPresses = 20;
      for (let i = 0; i < maxTabPresses; i++) {
        if (await firstLink.evaluate((el) => el === document.activeElement)) {
          break;
        }
        await page.keyboard.press('Tab');
      }

      await expect(firstLink).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/stores\/.+$/);
    });

    test('back to stores link is keyboard accessible', async ({page}) => {
      const storeLinks = getStoreLinks(page);

      await storeLinks.first().click();

      const backLink = page.getByRole('link', {name: 'Back to Stores'});
      await backLink.scrollIntoViewIfNeeded();
      await page.keyboard.press('Tab');

      const maxTabPresses = 20;
      for (let i = 0; i < maxTabPresses; i++) {
        if (await backLink.evaluate((el) => el === document.activeElement)) {
          break;
        }
        await page.keyboard.press('Tab');
      }

      await expect(backLink).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/stores$/);
    });
  });
});
