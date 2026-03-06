import {test, expect, setRecipeFixture} from '../../fixtures';

setRecipeFixture({
  recipeName: 'metaobjects',
  storeKey: 'hydrogenPreviewStorefront',
});

test.describe('Metaobjects Recipe', () => {
  test.describe('Homepage', () => {
    test('renders metaobject sections or content', async ({page}) => {
      await page.goto('/');

      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();

      const sections = page.locator('.sections');
      const sectionsCount = await sections.count();

      if (sectionsCount > 0) {
        await expect(sections).toBeVisible();
      }
    });
  });

  test.describe('Stores Index Route', () => {
    test('renders stores page with content or fallback', async ({page}) => {
      await page.goto('/stores');

      await expect(page).toHaveURL(/\/stores$/);
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();

      const pageContent = await page.textContent('body');
      const hasContent = (pageContent?.length || 0) > 200;
      const hasFallback = pageContent?.includes('No route content sections');

      expect(hasContent || hasFallback).toBe(true);
    });

    test('shows fallback when route has no sections', async ({page}) => {
      await page.goto('/stores/does-not-exist');

      await expect(page).toHaveURL(/\/stores\/does-not-exist$/);
      await expect(page.getByText('No route content sections')).toBeVisible();
      await expect(page.locator('.sections')).toHaveCount(0);
    });
  });

  test.describe('Individual Store Navigation', () => {
    test('navigates to store detail when stores exist', async ({page}) => {
      await page.goto('/stores');

      const storeLinks = page.locator('a[href^="/stores/"]').filter({
        has: page.locator('address'),
      });
      const linkCount = await storeLinks.count();

      if (linkCount > 0) {
        await storeLinks.first().click();
        await expect(page).toHaveURL(/\/stores\/.+$/);

        const backLink = page.getByRole('link', {name: 'Back to Stores'});
        if ((await backLink.count()) > 0) {
          await backLink.click();
          await expect(page).toHaveURL(/\/stores$/);
        }
      }
    });

    test('renders store profile details when route exists', async ({page}) => {
      await page.goto('/stores');

      const storeLinks = page.locator('a[href^="/stores/"]').filter({
        has: page.locator('address'),
      });
      const linkCount = await storeLinks.count();

      if (linkCount > 0) {
        await storeLinks.first().click();

        const storeContent = page.locator('.store');
        const storeCount = await storeContent.count();

        if (storeCount > 0) {
          await expect(storeContent).toBeVisible();
          await expect(page.getByRole('heading', {level: 1})).toBeVisible();
        }
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
        await expect(
          heroSection.first().getByRole('heading', {level: 1}),
        ).toBeVisible();
      }
    });

    test('renders product links when featured products exist', async ({
      page,
    }) => {
      await page.goto('/');

      const productLinks = page.locator('a[href*="/products/"]');
      const productCount = await productLinks.count();

      if (productCount > 0) {
        await expect(productLinks.first()).toBeVisible();
      }
    });

    test('renders store grid when configured', async ({page}) => {
      await page.goto('/stores');

      const storesSection = page.locator('.section-stores');
      const sectionCount = await storesSection.count();

      if (sectionCount > 0) {
        await expect(storesSection).toBeVisible();

        const storeLinks = storesSection.getByRole('link');
        await expect(storeLinks.first()).toBeVisible();
      }
    });
  });
});
