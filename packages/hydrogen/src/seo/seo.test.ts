import {createElement} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {Location, UIMatch, useMatches} from 'react-router';
import {cleanup, render} from '@testing-library/react';

import {Seo} from './seo';

vi.mock('react-router', () => ({
  useMatches: vi.fn(),
  useLocation: vi.fn(() => fillLocation()),
}));

describe('seo', () => {
  afterEach(() => {
    cleanup();
    document.head.innerHTML = '';
    vi.resetAllMocks();
  });

  it('it does not render any tags if seo is not provided', async () => {
    vi.mocked(useMatches).mockReturnValueOnce([
      fillMatch({
        data: {},
      }),
    ]);

    const {asFragment} = render(createElement(Seo));

    expect(asFragment()).toMatchInlineSnapshot('<DocumentFragment />');
  });

  it('takes the latest route match', async () => {
    vi.mocked(useMatches).mockReturnValueOnce([
      fillMatch({
        data: {
          seo: {title: 'Snow devil', description: 'A hydrogen storefront'},
        },
      }),
      fillMatch({
        data: {
          seo: {title: 'Sand devil'},
        },
      }),
    ]);

    const {asFragment} = render(createElement(Seo));

    expect(asFragment()).toMatchInlineSnapshot('<DocumentFragment />');
    expectSeoHead({
      title: 'Sand devil',
      description: 'A hydrogen storefront',
    });
  });

  it('uses seo loader data to generate the meta tags', async () => {
    vi.mocked(useMatches).mockReturnValueOnce([
      fillMatch({
        data: {
          seo: {title: 'Snow devil', description: 'A hydrogen storefront'},
        },
      }),
    ]);

    const {asFragment} = render(createElement(Seo));

    expect(asFragment()).toMatchInlineSnapshot('<DocumentFragment />');
    expectSeoHead({
      title: 'Snow devil',
      description: 'A hydrogen storefront',
    });
  });

  it('takes the latest route match', async () => {
    vi.mocked(useMatches).mockReturnValueOnce([
      fillMatch({
        data: {
          seo: {title: 'Snow devil', description: 'A hydrogen storefront'},
        },
      }),
      fillMatch({
        data: {
          seo: {title: 'Sand devil'},
        },
      }),
    ]);

    const {asFragment} = render(createElement(Seo));

    expect(asFragment()).toMatchInlineSnapshot('<DocumentFragment />');
    expectSeoHead({
      title: 'Sand devil',
      description: 'A hydrogen storefront',
    });
  });

  it('it renders a root jsonLd tag', async () => {
    vi.mocked(useMatches).mockReturnValueOnce([
      fillMatch({
        data: {
          seo: {
            jsonLd: {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Hydrogen Root',
            },
          },
        },
      }),
    ]);

    const {asFragment} = render(createElement(Seo));

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <script
          type="application/ld+json"
        >
          {"@context":"https://schema.org","@type":"Organization","name":"Hydrogen Root"}
        </script>
      </DocumentFragment>
    `);
  });

  it('it renders multiple jsonLd tags at the root', async () => {
    vi.mocked(useMatches).mockReturnValueOnce([
      fillMatch({
        data: {
          seo: {
            jsonLd: [
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Hydrogen Root',
              },
              {
                '@context': 'https://schema.org',
                '@type': 'Breadcrumbs',
                name: 'Main Menu',
              },
            ],
          },
        },
      }),
    ]);

    const {asFragment} = render(createElement(Seo));

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <script
          type="application/ld+json"
        >
          [{"@context":"https://schema.org","@type":"Organization","name":"Hydrogen Root"},{"@context":"https://schema.org","@type":"Breadcrumbs","name":"Main Menu"}]
        </script>
      </DocumentFragment>
    `);
  });

  it('it renders multiple jsonLd tags (layout and route)', async () => {
    vi.mocked(useMatches).mockReturnValueOnce([
      fillMatch({
        data: {
          seo: {
            jsonLd: {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Hydrogen Store',
            },
          },
        },
      }),
      fillMatch({
        data: {
          seo: {
            jsonLd: {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: 'Hydrogen Product',
            },
          },
        },
      }),
    ]);

    const {asFragment} = render(createElement(Seo));

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <script
          type="application/ld+json"
        >
          {"@context":"https://schema.org","@type":"Organization","name":"Hydrogen Store"}
        </script>
        <script
          type="application/ld+json"
        >
          {"@context":"https://schema.org","@type":"Product","name":"Hydrogen Product"}
        </script>
      </DocumentFragment>
    `);
  });

  it('escapes script content', async () => {
    vi.mocked(useMatches).mockReturnValueOnce([
      fillMatch({
        data: {
          seo: {
            jsonLd: {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Hydrogen Root',
              description: '</script><script>alert("hacked")</script>',
            },
          },
        },
      }),
    ]);

    const {asFragment} = render(createElement(Seo));

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <script
          type="application/ld+json"
        >
          {"@context":"https://schema.org","@type":"Organization","name":"Hydrogen Root","description":"\\\\u003c/script\\\\u003e\\\\u003cscript\\\\u003ealert(\\"hacked\\")\\\\u003c/script\\\\u003e"}
        </script>
      </DocumentFragment>
    `);
  });
});

function fillMatch(
  partial: Partial<UIMatch<any>> & {data?: UIMatch<any>['loaderData']} = {},
) {
  const {data, loaderData, ...match} = partial;

  return {
    id: 'root',
    pathname: '/',
    params: {
      productHandle: 'shopify-aurora',
    },
    handle: {},
    loaderData: loaderData ?? data ?? {},
    ...match,
  };
}

function fillLocation(partial: Partial<Location> = {}) {
  return {
    key: '',
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    ...partial,
  };
}

function expectSeoHead({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  expect(document.title).toBe(title);
  expect(
    document.head
      .querySelector('meta[name="description"]')
      ?.getAttribute('content'),
  ).toBe(description);
  expect(
    document.head
      .querySelector('meta[property="og:description"]')
      ?.getAttribute('content'),
  ).toBe(description);
  expect(
    document.head
      .querySelector('meta[property="og:title"]')
      ?.getAttribute('content'),
  ).toBe(title);
  expect(
    document.head
      .querySelector('meta[name="twitter:description"]')
      ?.getAttribute('content'),
  ).toBe(description);
  expect(
    document.head
      .querySelector('meta[name="twitter:title"]')
      ?.getAttribute('content'),
  ).toBe(title);
}
