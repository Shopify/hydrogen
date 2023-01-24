import {test, expect} from '@playwright/test';

test.describe('home', () => {
  test('has meta elements for description and title', async ({page}) => {
    const text = {
      title: 'Hydrogen',
      description:
        "A custom storefront powered by Hydrogen, Shopify's React-based framework for building headless.",
      url: 'https://hydrogen.shop',
    };
    const entries = [
      [
        'description',
        [
          'meta[name="description"]',
          'meta[property="og:description"]',
          'meta[name="twitter:description"]',
        ],
      ],
      ['title', ['meta[property="og:title"]', 'meta[name="twitter:title"]']],
      ['url', ['meta[property="og:url"]']],
    ];

    await page.goto(`/`);

    for (const [key, elements] of entries) {
      const expected = text[key as keyof typeof text];
      for (const element of elements) {
        const meta = await page.locator(element);
        await expect(meta).toHaveAttribute('content', expected);
      }
    }
  });
});
