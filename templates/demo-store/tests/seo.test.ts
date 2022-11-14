import {test, expect} from '@playwright/test';

test.describe('home', () => {
  test('has meta elements for description, title and robots', async ({
    page,
  }) => {
    const text = {
      robots: 'index,follow',
      title: 'Hydrogen',
      description:
        "A custom storefront powered by Hydrogen, Shopify's React-based framework for building headless.",
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
      ['robots', ['meta[name="robots"]', 'meta[name="googlebot"]']],
      ['title', ['meta[property="og:title"]', 'meta[name="twitter:title"]']],
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
