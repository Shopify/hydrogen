import {
  test,
  expect,
  setTestStore,
  MSW_SCENARIOS,
  STOREFRONT_REDIRECT_PATHS,
} from '../../fixtures';

setTestStore('mockShop', {
  mock: {scenario: MSW_SCENARIOS.storefrontRedirects},
});

test.describe('storefrontRedirect', () => {
  test('redirects on full page navigation', async ({page}) => {
    await page.goto(STOREFRONT_REDIRECT_PATHS.from);
    await expect(page).toHaveURL(
      new RegExp(`${STOREFRONT_REDIRECT_PATHS.to}$`),
    );
  });

  test('redirects on client-side navigation (Single Fetch)', async ({page}) => {
    await page.goto('/');
    await page.waitForFunction(() => document.readyState === 'complete');

    await page.evaluate((href) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = 'test redirect link';
      document.body.appendChild(link);
    }, STOREFRONT_REDIRECT_PATHS.from);

    await page.getByText('test redirect link').click();
    await expect(page).toHaveURL(
      new RegExp(`${STOREFRONT_REDIRECT_PATHS.to}$`),
    );
  });
});
