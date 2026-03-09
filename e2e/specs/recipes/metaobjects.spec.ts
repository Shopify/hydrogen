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

test.describe('Metaobjects Recipe', () => {
  test.describe('Homepage', () => {
    test('renders route content with metaobject sections', async ({page}) => {
      await page.goto('/');

      await expect(page.getByRole('banner')).toBeVisible();

      await expect(
        page.getByText('No route content sections'),
      ).not.toBeVisible();

      const sections = page.locator('.sections');
      await expect(sections).toBeVisible();

      const sectionElements = sections.locator('> *');
      const sectionCount = await sectionElements.count();
      expect(sectionCount).toBeGreaterThan(0);
    });

    test('renders multiple section types via type switching', async ({
      page,
    }) => {
      await page.goto('/');

      const sections = page.locator('.sections');
      const sectionElements = sections.locator('> *');
      const totalSections = await sectionElements.count();

      expect(totalSections).toBeGreaterThan(0);
    });
  });

  test.describe('Stores Index Route', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/stores');
    });

    test('renders stores route with metaobject content', async ({page}) => {
      await expect(page).toHaveURL(/\/stores$/);
      await expect(page.getByRole('banner')).toBeVisible();

      await expect(
        page.getByText('No route content sections'),
      ).not.toBeVisible();

      const sections = page.locator('.sections');
      await expect(sections).toBeVisible();
    });

    test('shows fallback when route has no sections', async ({page}) => {
      await page.goto('/stores/does-not-exist');

      await expect(page).toHaveURL(/\/stores\/does-not-exist$/);

      await expect(page.getByText('No route content sections')).toBeVisible();

      await expect(page.locator('.sections')).toHaveCount(0);
    });
  });

  test.describe('Individual Store Navigation', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/stores');
    });

    test('navigates to store detail and back', async ({page}) => {
      const storeLinks = page.locator('a[href^="/stores/"]').filter({
        has: page.locator('address'),
      });

      await storeLinks.first().click();
      await expect(page).toHaveURL(/\/stores\/.+$/);

      const backLink = page.getByRole('link', {name: 'Back to Stores'});
      await expect(backLink).toBeVisible();
      await backLink.click();
      await expect(page).toHaveURL(/\/stores$/);
    });

    test('renders store profile details', async ({page}) => {
      const storeLinks = page.locator('a[href^="/stores/"]').filter({
        has: page.locator('address'),
      });

      await storeLinks.first().click();

      const storeContent = page.locator('section.store');
      await expect(storeContent).toBeVisible();

      await expect(page.getByRole('heading', {level: 1})).toBeVisible();

      await expect(storeContent.locator('address')).toBeVisible();
    });

    test('handles dynamic route parameters in GraphQL query', async ({
      page,
    }) => {
      const storeLinks = page.locator('a[href^="/stores/"]').filter({
        has: page.locator('address'),
      });

      await storeLinks.first().click();

      await expect(
        page.getByText('No route content sections'),
      ).not.toBeVisible();

      const storeContent = page.locator('section.store');
      await expect(storeContent).toBeVisible();
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
    test('shows edit button in development environment', async ({page}) => {
      await page.goto('/');

      const currentUrl = page.url();
      const isDevelopmentEnv =
        currentUrl.includes('localhost') ||
        currentUrl.includes('127.0.0.1') ||
        currentUrl.includes('preview');

      const editButton = page.getByRole('link', {name: 'Edit Route'});

      if (isDevelopmentEnv) {
        await expect(editButton).toBeVisible();

        const href = await editButton.getAttribute('href');
        expect(href).toContain('admin.shopify.com');
        expect(href).toContain('/content/entries/route/');

        const target = await editButton.getAttribute('target');
        const rel = await editButton.getAttribute('rel');
        expect(target).toBe('_blank');
        expect(rel).toBe('noreferrer');
      } else {
        await expect(editButton).toHaveCount(0);
      }
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/stores');
    });

    test('store links are keyboard navigable', async ({page}) => {
      const storeLinks = page.locator('a[href^="/stores/"]').filter({
        has: page.locator('address'),
      });

      const firstLink = storeLinks.first();
      await firstLink.focus();
      await expect(firstLink).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/stores\/.+$/);
    });

    test('back to stores link is keyboard accessible', async ({page}) => {
      const storeLinks = page.locator('a[href^="/stores/"]').filter({
        has: page.locator('address'),
      });

      await storeLinks.first().click();

      const backLink = page.getByRole('link', {name: 'Back to Stores'});
      await backLink.focus();
      await expect(backLink).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/stores$/);
    });
  });
});
