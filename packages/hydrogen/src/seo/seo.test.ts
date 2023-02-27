import {createElement} from 'react';
import {vi, expect, it, describe, afterEach} from 'vitest';
import {useMatches, Location, RouteMatch} from '@remix-run/react';
import {render, cleanup} from '@testing-library/react';

import {Seo} from './seo';

vi.mock('@remix-run/react', () => ({
  useMatches: vi.fn(),
  useLocation: vi.fn(() => fillLocation()),
}));

describe('seo', () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
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

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <title>
          Snow devil
        </title>
        <meta
          content="A hydrogen storefront"
          name="description"
        />
        <meta
          content="A hydrogen storefront"
          property="og:description"
        />
        <meta
          content="Snow devil"
          property="og:title"
        />
        <meta
          content="website"
          property="og:type"
        />
        <meta
          content="summary_large_image"
          name="twitter:card"
        />
        <meta
          content="A hydrogen storefront"
          name="twitter:description"
        />
        <meta
          content="Snow devil"
          name="twitter:title"
        />
        <script
          type="application/ld+json"
        >
          {"@context":"https://schema.org","@type":"Thing","name":"Snow devil","description":"A hydrogen storefront"}
        </script>
      </DocumentFragment>
    `);
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

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <title>
          Sand devil
        </title>
        <meta
          content="A hydrogen storefront"
          name="description"
        />
        <meta
          content="A hydrogen storefront"
          property="og:description"
        />
        <meta
          content="Sand devil"
          property="og:title"
        />
        <meta
          content="website"
          property="og:type"
        />
        <meta
          content="summary_large_image"
          name="twitter:card"
        />
        <meta
          content="A hydrogen storefront"
          name="twitter:description"
        />
        <meta
          content="Sand devil"
          name="twitter:title"
        />
        <script
          type="application/ld+json"
        >
          {"@context":"https://schema.org","@type":"Thing","name":"Sand devil","description":"A hydrogen storefront"}
        </script>
      </DocumentFragment>
    `);
  });
});

function fillMatch(partial: Partial<RouteMatch> = {}) {
  return {
    id: 'root',
    pathname: '/',
    params: {
      productHandle: 'shopify-aurora',
    },
    handle: {},
    data: {},
    ...partial,
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
