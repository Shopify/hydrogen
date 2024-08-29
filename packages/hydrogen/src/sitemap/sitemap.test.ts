import {expect, suite, test} from 'vitest';
import {getSitemap, getSitemapIndex} from './sitemap';

suite('sitemap', () => {
  suite('getSitemapIndex', () => {
    test('renders an empty sitemap index', async () => {
      const sitemap = await getSitemapIndex({
        storefront: mockSitemapIndexResponse({}) as any,
        request: {url: 'https://example.com'} as any,
        types: [],
      });
      expect(await sitemap.text()).toMatchInlineSnapshot(`
        "<?xml version="1.0" encoding="UTF-8"?>
        <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

        </sitemapindex>"
      `);
    });

    test('errors when a request object or storefront object are not passed', async () => {
      async function noRequest() {
        const sitemap = await getSitemapIndex({
          storefront: mockSitemapIndexResponse({}),
        } as any);
      }

      await expect(noRequest).rejects.toThrowError(
        'A request object is required to generate a sitemap index',
      );

      async function noStorefront() {
        const sitemap = await getSitemapIndex({
          request: {url: 'https://example.com'},
        } as any);
      }

      await expect(noStorefront).rejects.toThrowError(
        'A storefront client is required to generate a sitemap index',
      );
    });

    test('renders a sitemap index', async () => {
      const sitemap = await getSitemapIndex({
        storefront: mockSitemapIndexResponse(),
        request: {url: 'https://example.com'},
      } as any);

      expect(await sitemap.text()).toMatchInlineSnapshot(`
        "<?xml version="1.0" encoding="UTF-8"?>
        <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <sitemap><loc>https://example.com/sitemap/products/1.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/products/2.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/products/3.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/products/4.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/products/5.xml</loc></sitemap>

          <sitemap><loc>https://example.com/sitemap/pages/1.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/pages/2.xml</loc></sitemap>

          <sitemap><loc>https://example.com/sitemap/collections/1.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/collections/2.xml</loc></sitemap>

          <sitemap><loc>https://example.com/sitemap/metaObjects/1.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/metaObjects/2.xml</loc></sitemap>

          <sitemap><loc>https://example.com/sitemap/articles/1.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/articles/2.xml</loc></sitemap>

          <sitemap><loc>https://example.com/sitemap/blogs/1.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/blogs/2.xml</loc></sitemap>

        </sitemapindex>"
      `);
    });

    test('renders links to child sitemap types', async () => {
      const sitemap = await getSitemapIndex({
        types: ['collections'],
        storefront: mockSitemapIndexResponse(),
        request: {url: 'https://example.com'},
      } as any);

      expect(await sitemap.text()).toMatchInlineSnapshot(`
        "<?xml version="1.0" encoding="UTF-8"?>
        <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <sitemap><loc>https://example.com/sitemap/collections/1.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/collections/2.xml</loc></sitemap>

        </sitemapindex>"
      `);
    });

    test('errors when using unknown types', async () => {
      async function makeError() {
        const sitemap = await getSitemapIndex({
          types: ['jarjar'],
          storefront: mockSitemapIndexResponse(),
          request: {url: 'https://example.com'},
        } as any);
      }

      await expect(makeError).rejects.toThrowError(
        '[h2:sitemap:error] No data found for type jarjar. Check types passed to `getSitemapIndex`',
      );
    });

    test('adds links to custom child sitemaps', async () => {
      const sitemap = await getSitemapIndex({
        types: ['collections'],
        storefront: mockSitemapIndexResponse() as any,
        request: {url: 'https://example.com'},
        customChildSitemaps: ['sitemap/custom.xml', '/sitemap/custom-2.xml'],
      } as any);

      expect(await sitemap.text()).toMatchInlineSnapshot(`
        "<?xml version="1.0" encoding="UTF-8"?>
        <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <sitemap><loc>https://example.com/sitemap/collections/1.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/collections/2.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/custom.xml</loc></sitemap>
          <sitemap><loc>https://example.com/sitemap/custom-2.xml</loc></sitemap>
        </sitemapindex>"
      `);
    });
  });

  suite('getSitemap', () => {
    test('errors when a request object or storefront object are not passed', async () => {
      await expect(async function makeError() {
        const sitemap = await getSitemap({} as any);
      }).rejects.toThrowError(
        '[h2:sitemap:error] Remix params object is required',
      );

      await expect(async function makeError() {
        const sitemap = await getSitemap({
          params: {type: 'products', page: '1'},
        } as any);
      }).rejects.toThrowError(
        'A request object is required to generate a sitemap',
      );

      await expect(async function makeError() {
        const sitemap = await getSitemap({
          params: {type: 'products', page: '1'},
          request: {url: 'https://example.com'},
        } as any);
      }).rejects.toThrowError(
        'A storefront client is required to generate a index',
      );

      await expect(async function makeError() {
        const sitemap = await getSitemap({
          params: {type: 'products', page: '1'},
          request: {url: 'https://example.com'},
          storefront: mockSitemapResponse('products', 2),
        } as any);
      }).rejects.toThrowError(
        'A `getLink` function to generate each resource is required to build a sitemap',
      );
    });

    test('renders a sitemap', async () => {
      const sitemap = await getSitemap({
        params: {type: 'products', page: '1'},
        storefront: mockSitemapResponse('products', 5),
        request: {url: 'https://example.com'},
        getLink: ({handle, baseUrl, type}: any) =>
          `${baseUrl}/${type}/${handle}`,
      } as any);

      expect(await sitemap.text()).toMatchInlineSnapshot(`
        "<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"><url>
          <loc>https://example.com/products/1</loc>
          <lastmod>2021-09-01T00:00:00Z</lastmod>
          <changefreq>weekly</changefreq>

        </url>
        <url>
          <loc>https://example.com/products/2</loc>
          <lastmod>2021-09-01T00:00:00Z</lastmod>
          <changefreq>weekly</changefreq>

        </url>
        <url>
          <loc>https://example.com/products/3</loc>
          <lastmod>2021-09-01T00:00:00Z</lastmod>
          <changefreq>weekly</changefreq>

        </url>
        <url>
          <loc>https://example.com/products/4</loc>
          <lastmod>2021-09-01T00:00:00Z</lastmod>
          <changefreq>weekly</changefreq>

        </url>
        <url>
          <loc>https://example.com/products/5</loc>
          <lastmod>2021-09-01T00:00:00Z</lastmod>
          <changefreq>weekly</changefreq>

        </url></urlset>"
      `);
    });

    test('renders custom links', async () => {
      const sitemap = await getSitemap({
        params: {type: 'products', page: '1'},
        storefront: mockSitemapResponse('products', 2),
        request: {url: 'https://example.com'},
        getLink: ({handle, baseUrl, type}: any) =>
          `${baseUrl}/custom/${type}/${handle}`,
      } as any);

      expect(await sitemap.text()).toMatchInlineSnapshot(`
        "<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"><url>
          <loc>https://example.com/custom/products/1</loc>
          <lastmod>2021-09-01T00:00:00Z</lastmod>
          <changefreq>weekly</changefreq>

        </url>
        <url>
          <loc>https://example.com/custom/products/2</loc>
          <lastmod>2021-09-01T00:00:00Z</lastmod>
          <changefreq>weekly</changefreq>

        </url></urlset>"
      `);
    });

    test('renders localized links', async () => {
      const sitemap = await getSitemap({
        params: {type: 'products', page: '1'},
        storefront: mockSitemapResponse('products', 2),
        request: {url: 'https://example.com'},
        getLink: ({handle, baseUrl, type, locale}: any) =>
          locale
            ? `${baseUrl}/${locale}/${type}/${handle}`
            : `${baseUrl}/${type}/${handle}`,
        locales: ['en-CA', 'fr-CA'],
      } as any);

      expect(await sitemap.text()).toMatchInlineSnapshot(`
        "<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"><url>
          <loc>https://example.com/products/1</loc>
          <lastmod>2021-09-01T00:00:00Z</lastmod>
          <changefreq>weekly</changefreq>
          <xhtml:link rel="alternate" hreflang="en-CA" href="https://example.com/en-CA/products/1" />
          <xhtml:link rel="alternate" hreflang="fr-CA" href="https://example.com/fr-CA/products/1" />
        </url>
        <url>
          <loc>https://example.com/products/2</loc>
          <lastmod>2021-09-01T00:00:00Z</lastmod>
          <changefreq>weekly</changefreq>
          <xhtml:link rel="alternate" hreflang="en-CA" href="https://example.com/en-CA/products/2" />
          <xhtml:link rel="alternate" hreflang="fr-CA" href="https://example.com/fr-CA/products/2" />
        </url></urlset>"
      `);
    });

    test('renders custom changefreq', async () => {
      const sitemap = await getSitemap({
        params: {type: 'products', page: '1'},
        storefront: mockSitemapResponse('products', 1),
        request: {url: 'https://example.com'},
        getLink: ({handle, baseUrl, type}: any) =>
          `${baseUrl}/${type}/${handle}`,
        getChangeFreq: () => 'daily',
      } as any);

      expect(await sitemap.text()).toMatchInlineSnapshot(`
        "<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"><url>
          <loc>https://example.com/products/1</loc>
          <lastmod>2021-09-01T00:00:00Z</lastmod>
          <changefreq>daily</changefreq>

        </url></urlset>"
      `);
    });

    test('renders a link to the home page if there are no resources', async () => {
      const sitemap = await getSitemap({
        params: {type: 'products', page: '1'},
        storefront: mockSitemapResponse('products', 0),
        request: {url: 'https://example.com'},
        getLink: ({handle, baseUrl, type}: any) =>
          `${baseUrl}/${type}/${handle}`,
        noItemsFallback: '/jarjarbinks',
      } as any);

      expect(await sitemap.text()).toMatchInlineSnapshot(`
        "<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
          <url><loc>https://example.com/jarjarbinks</loc></url>
        </urlset>"
      `);
    });
  });
});

function mockSitemapIndexResponse(
  data: any = {
    products: {
      pagesCount: {count: 5},
    },
    collections: {
      pagesCount: {count: 2},
    },
    articles: {
      pagesCount: {count: 2},
    },
    pages: {
      pagesCount: {count: 2},
    },
    blogs: {
      pagesCount: {count: 2},
    },
    metaObjects: {
      pagesCount: {count: 2},
    },
  },
) {
  return {
    query: async () => data,
  };
}

function mockSitemapResponse(
  type: string,
  amount: number,
  updatedAt: string = '2021-09-01T00:00:00Z',
) {
  const items = !amount
    ? []
    : new Array(amount).fill(0).map((_, i) => ({
        handle: i + 1,
        type,
        updatedAt,
      }));

  return {
    query: async () => ({
      sitemap: {
        resources: {
          items,
        },
      },
    }),
  };
}
