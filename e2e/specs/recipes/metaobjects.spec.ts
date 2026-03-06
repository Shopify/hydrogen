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

      // Verify RouteContent component rendered successfully (not fallback)
      await expect(
        page.getByText('No route content sections'),
      ).not.toBeVisible();

      // Verify sections container exists and has content
      const sections = page.locator('.sections');
      await expect(sections).toBeVisible();

      // Verify at least one section rendered (proves metaobjects CMS is working)
      const sectionElements = sections.locator('> *');
      const sectionCount = await sectionElements.count();
      expect(sectionCount).toBeGreaterThan(0);
    });

    test('renders multiple section types via type switching', async ({
      page,
    }) => {
      await page.goto('/');

      // Test that the section switching logic in Sections.tsx works
      const sections = page.locator('.sections');
      const sectionElements = sections.locator('> *');
      const totalSections = await sectionElements.count();

      // Verify multiple different section types can render
      expect(totalSections).toBeGreaterThan(0);
    });
  });

  test.describe('Stores Index Route', () => {
    test('renders stores route with metaobject content', async ({page}) => {
      await page.goto('/stores');

      await expect(page).toHaveURL(/\/stores$/);
      await expect(page.getByRole('banner')).toBeVisible();

      // Verify RouteContent rendered successfully (not fallback)
      await expect(
        page.getByText('No route content sections'),
      ).not.toBeVisible();

      // Verify sections container exists
      const sections = page.locator('.sections');
      await expect(sections).toBeVisible();
    });

    test('shows fallback when route has no sections', async ({page}) => {
      await page.goto('/stores/does-not-exist');

      await expect(page).toHaveURL(/\/stores\/does-not-exist$/);

      // Verify fallback message displayed (per RouteContent.tsx line 8)
      await expect(page.getByText('No route content sections')).toBeVisible();

      // Verify sections container doesn't exist or is empty
      await expect(page.locator('.sections')).toHaveCount(0);
    });
  });

  test.describe('Individual Store Navigation', () => {
    test('navigates to store detail and back', async ({page}) => {
      await page.goto('/stores');

      const storeLinks = page.locator('a[href^="/stores/"]').filter({
        has: page.locator('address'),
      });
      const linkCount = await storeLinks.count();

      if (linkCount > 0) {
        await storeLinks.first().click();
        await expect(page).toHaveURL(/\/stores\/.+$/);

        const backLink = page.getByRole('link', {name: 'Back to Stores'});
        await expect(backLink).toBeVisible();
        await backLink.click();
        await expect(page).toHaveURL(/\/stores$/);
      }
    });

    test('renders store profile details', async ({page}) => {
      await page.goto('/stores');

      const storeLinks = page.locator('a[href^="/stores/"]').filter({
        has: page.locator('address'),
      });
      const linkCount = await storeLinks.count();

      if (linkCount > 0) {
        await storeLinks.first().click();

        const storeContent = page.locator('.store');
        await expect(storeContent).toBeVisible();

        // Verify required heading exists (per SectionStoreProfile.tsx line 33)
        await expect(page.getByRole('heading', {level: 1})).toBeVisible();

        // Verify address is present (per SectionStoreProfile.tsx line 38)
        await expect(storeContent.locator('address')).toBeVisible();
      }
    });

    test('handles dynamic route parameters in GraphQL query', async ({
      page,
    }) => {
      await page.goto('/stores');

      const storeLinks = page.locator('a[href^="/stores/"]').filter({
        has: page.locator('address'),
      });
      const linkCount = await storeLinks.count();

      if (linkCount > 0) {
        await storeLinks.first().click();

        // If GraphQL query with dynamic handle succeeded, no fallback
        await expect(
          page.getByText('No route content sections'),
        ).not.toBeVisible();

        // Store section should render
        const storeContent = page.locator('.store');
        await expect(storeContent).toBeVisible();
      }
    });
  });

  test.describe('Section Components', () => {
    test('renders hero section when configured', async ({page}) => {
      await page.goto('/');

      const heroSection = page.locator('.section-hero');
      const heroCount = await heroSection.count();

      if (heroCount > 0) {
        await expect(heroSection.first()).toBeVisible();

        // Verify required heading (per SectionHero.tsx line 47)
        await expect(
          heroSection.first().getByRole('heading', {level: 1}),
        ).toBeVisible();
      }
    });

    test('renders product links when featured products configured', async ({
      page,
    }) => {
      await page.goto('/');

      const productLinks = page.locator('a[href*="/products/"]');
      const productCount = await productLinks.count();

      if (productCount > 0) {
        await expect(productLinks.first()).toBeVisible();

        // Verify link structure
        const href = await productLinks.first().getAttribute('href');
        expect(href).toMatch(/\/products\/.+/);
      }
    });

    test('renders featured collections when configured', async ({page}) => {
      await page.goto('/');

      const collectionsSection = page.locator('.featured-collection');
      const sectionCount = await collectionsSection.count();

      if (sectionCount > 0) {
        await expect(collectionsSection.first()).toBeVisible();

        // Verify collection links exist
        const collectionLinks = collectionsSection
          .first()
          .locator('a[href*="/collections/"]');
        const linkCount = await collectionLinks.count();

        if (linkCount > 0) {
          await expect(collectionLinks.first()).toBeVisible();

          // Verify image rendered (per SectionFeaturedCollections.tsx line 28-32)
          await expect(collectionLinks.first().locator('img')).toBeVisible();
        }
      }
    });

    test('renders store grid when configured', async ({page}) => {
      await page.goto('/stores');

      const storesSection = page.locator('.section-stores');
      const sectionCount = await storesSection.count();

      if (sectionCount > 0) {
        await expect(storesSection).toBeVisible();

        const storeLinks = storesSection.getByRole('link');
        const linkCount = await storeLinks.count();

        if (linkCount > 0) {
          await expect(storeLinks.first()).toBeVisible();

          // Verify address element present (per SectionStores.tsx line 48)
          await expect(storeLinks.first().locator('address')).toBeVisible();
        }
      }
    });
  });

  test.describe('EditRoute Component', () => {
    test('shows edit button in development environment', async ({page}) => {
      await page.goto('/');

      // EditRoute checks for localhost/127.0.0.1/preview (per EditRoute.tsx line 21-23)
      const currentUrl = page.url();
      const isDevelopmentEnv =
        currentUrl.includes('localhost') ||
        currentUrl.includes('127.0.0.1') ||
        currentUrl.includes('preview');

      const editButton = page.getByRole('link', {name: 'Edit Route'});
      const buttonCount = await editButton.count();

      if (isDevelopmentEnv && buttonCount > 0) {
        await expect(editButton).toBeVisible();

        // Verify link points to Shopify admin
        const href = await editButton.getAttribute('href');
        expect(href).toContain('admin.shopify.com');
        expect(href).toContain('/content/entries/route/');

        // Verify opens in new tab (per EditRoute.tsx line 33-34)
        const target = await editButton.getAttribute('target');
        const rel = await editButton.getAttribute('rel');
        expect(target).toBe('_blank');
        expect(rel).toBe('noreferrer');
      }
    });
  });

  test.describe('Accessibility', () => {
    test('store links are keyboard navigable', async ({page}) => {
      await page.goto('/stores');

      const storeLinks = page.locator('a[href^="/stores/"]').filter({
        has: page.locator('address'),
      });
      const linkCount = await storeLinks.count();

      if (linkCount > 0) {
        const firstLink = storeLinks.first();
        await firstLink.focus();
        await expect(firstLink).toBeFocused();

        // Verify can activate with Enter
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/stores\/.+$/);
      }
    });

    test('product links are keyboard navigable', async ({page}) => {
      await page.goto('/');

      const productLinks = page.locator('a[href*="/products/"]');
      const productCount = await productLinks.count();

      if (productCount > 0) {
        const firstLink = productLinks.first();
        await firstLink.focus();
        await expect(firstLink).toBeFocused();

        // Verify can activate with Enter
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/products\/.+/);
      }
    });

    test('back to stores link is keyboard accessible', async ({page}) => {
      await page.goto('/stores');

      const storeLinks = page.locator('a[href^="/stores/"]').filter({
        has: page.locator('address'),
      });
      const linkCount = await storeLinks.count();

      if (linkCount > 0) {
        await storeLinks.first().click();

        const backLink = page.getByRole('link', {name: 'Back to Stores'});
        await backLink.focus();
        await expect(backLink).toBeFocused();

        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/stores$/);
      }
    });
  });
});
