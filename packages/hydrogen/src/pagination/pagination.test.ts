import {getPaginationVariables, Pagination} from './Pagination';
import {createElement, Fragment} from 'react';
import {cleanup, render} from '@testing-library/react';
import {describe, it, expect, afterEach, vi, afterAll} from 'vitest';
import type {LinkProps} from '@remix-run/react';

vi.mock('react', async (importOriginal) => {
  const mod = (await importOriginal()) as any;
  return {
    ...mod,
    useEffect: vi.fn(),
  };
});

vi.mock('@remix-run/react', () => ({
  useNavigation: vi.fn(() => ({
    state: 'idle',
  })),
  useNavigate: vi.fn(() => ({
    navigate() {},
  })),
  useLocation: vi.fn(() => fillLocation()),
  Link: vi.fn(({to, state, preventScrollReset}: LinkProps) =>
    createElement('a', {
      href: to,
      state: JSON.stringify(state),
      'data-preventscrollreset': preventScrollReset,
    }),
  ),
}));

describe('getPaginationVariables', () => {
  it('throws without a request object', () => {
    function shouldThrow() {
      // @ts-expect-error
      getPaginationVariables();
    }

    expect(shouldThrow).toThrowError(
      'getPaginationVariables must be called with the Request object passed to your loader function',
    );
  });

  it('returns default pagination variables', () => {
    expect(
      getPaginationVariables(new Request('https://localhost:3000')),
    ).toEqual({endCursor: null, first: 20});
  });

  it('returns cursor from search params', () => {
    expect(
      getPaginationVariables(
        new Request('https://localhost:3000?cursor=abc&direction=previous'),
      ),
    ).toEqual({startCursor: 'abc', last: 20});
  });

  it('overrides number of items in each page', () => {
    expect(
      getPaginationVariables(
        new Request('https://localhost:3000?cursor=abc&direction=previous'),
        {pageBy: 10},
      ),
    ).toEqual({startCursor: 'abc', last: 10});
  });

  it('returns cursor from search params with namespace', () => {
    expect(
      getPaginationVariables(
        new Request(
          'https://localhost:3000?products_cursor=abc&products_direction=previous',
        ),
        {pageBy: 20, namespace: 'products'},
      ),
    ).toEqual({startCursor: 'abc', last: 20});
  });
});

describe('<Pagination>', () => {
  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  it("throws when pageInfo isn't provided", () => {
    function makeError() {
      render(
        createElement(Pagination, {
          // @ts-expect-error
          connection: {
            nodes: [1, 2, 3],
          },
          children: ({nodes}) =>
            createElement(
              Fragment,
              null,
              nodes.map((node) =>
                createElement('div', {key: node as string}, node as string),
              ),
            ),
        }),
      );
    }
    expect(makeError).toThrowError(
      'The Pagination component requires `pageInfo` to be a part of your query. See the guide on how to setup your query to include `pageInfo`: https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination#setup-the-paginated-query',
    );
  });

  it("throws when pageInfo properties aren't provided", () => {
    function makeError(pageInfo: any) {
      return function () {
        render(
          createElement(Pagination, {
            connection: {
              nodes: [1, 2, 3],
              pageInfo,
            },
            children: ({nodes}) =>
              createElement(
                Fragment,
                null,
                nodes.map((node) =>
                  createElement('div', {key: node as string}, node as string),
                ),
              ),
          }),
        );
      };
    }
    expect(
      makeError({
        hasPreviousPage: true,
        hasNextPage: true,
        startCursor: 'abc',
      }),
    ).toThrowError(
      'The Pagination component requires `pageInfo.endCursor` to be a part of your query. See the guide on how to setup your query to include `pageInfo.endCursor`: https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination#setup-the-paginated-query',
    );

    expect(
      makeError({
        hasPreviousPage: true,
        hasNextPage: true,
        endCursor: 'abc',
      }),
    ).toThrowError(
      'The Pagination component requires `pageInfo.startCursor` to be a part of your query. See the guide on how to setup your query to include `pageInfo.startCursor`: https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination#setup-the-paginated-query',
    );

    expect(
      makeError({
        hasPreviousPage: true,
        startCursor: 'abc',
        endCursor: 'abc',
      }),
    ).toThrowError(
      'The Pagination component requires `pageInfo.hasNextPage` to be a part of your query. See the guide on how to setup your query to include `pageInfo.hasNextPage`: https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination#setup-the-paginated-query',
    );

    expect(
      makeError({
        hasNextPage: true,
        startCursor: 'abc',
        endCursor: 'abc',
      }),
    ).toThrowError(
      'The Pagination component requires `pageInfo.hasPreviousPage` to be a part of your query. See the guide on how to setup your query to include `pageInfo.hasPreviousPage`: https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination#setup-the-paginated-query',
    );
  });

  it('passes nodes to children as render props', () => {
    const {asFragment} = render(
      createElement(Pagination, {
        connection: {
          nodes: [1, 2, 3],
          pageInfo: {
            endCursor: '',
            startCursor: '',
            hasNextPage: true,
            hasPreviousPage: false,
          },
        },
        children: ({nodes}) =>
          createElement(
            Fragment,
            null,
            nodes.map((node) =>
              createElement('div', {key: node as string}, node as string),
            ),
          ),
      }),
    );
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          1
        </div>
        <div>
          2
        </div>
        <div>
          3
        </div>
      </DocumentFragment>
    `);
  });

  it('renders next link and not previous link', () => {
    const {asFragment} = render(
      createElement(Pagination, {
        connection: {
          nodes: [1, 2, 3],
          pageInfo: {
            endCursor: 'abc',
            startCursor: 'cde',
            hasNextPage: true,
            hasPreviousPage: false,
          },
        },
        children: ({NextLink, PreviousLink}) =>
          createElement(
            'div',
            null,
            createElement(NextLink, null, 'Next'),
            createElement(PreviousLink, null, 'Previous'),
          ),
      }),
    );
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          <a
            data-preventscrollreset="true"
            href="?direction=next&cursor=abc"
            state="{"pageInfo":{"endCursor":"abc","hasPreviousPage":false,"hasNextPage":true,"startCursor":"cde"},"nodes":[1,2,3]}"
          />
        </div>
      </DocumentFragment>
    `);
  });

  it('renders previous link and not next link', () => {
    const {asFragment} = render(
      createElement(Pagination, {
        connection: {
          nodes: [1, 2, 3],
          pageInfo: {
            endCursor: 'abc',
            startCursor: 'cde',
            hasNextPage: false,
            hasPreviousPage: true,
          },
        },
        children: ({NextLink, PreviousLink}) =>
          createElement(
            'div',
            null,
            createElement(NextLink, null, 'Next'),
            createElement(PreviousLink, null, 'Previous'),
          ),
      }),
    );
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          <a
            data-preventscrollreset="true"
            href="?direction=previous&cursor=cde"
            state="{"pageInfo":{"endCursor":"abc","hasPreviousPage":true,"hasNextPage":false,"startCursor":"cde"},"nodes":[1,2,3]}"
          />
        </div>
      </DocumentFragment>
    `);
  });

  it('passes all render props', () => {
    const {asFragment} = render(
      createElement(Pagination, {
        connection: {
          nodes: [1, 2, 3],
          pageInfo: {
            endCursor: 'abc',
            startCursor: 'cde',
            hasNextPage: false,
            hasPreviousPage: true,
          },
        },
        children: ({
          state,
          hasNextPage,
          hasPreviousPage,
          isLoading,
          nextPageUrl,
          nodes,
          previousPageUrl,
        }) =>
          createElement(
            'div',
            null,
            JSON.stringify(
              {
                state,
                hasNextPage,
                hasPreviousPage,
                isLoading,
                nextPageUrl,
                nodes,
                previousPageUrl,
              },
              null,
              '  ',
            ),
          ),
      }),
    );
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          {
        "state": {
          "pageInfo": {
            "endCursor": "abc",
            "hasPreviousPage": true,
            "hasNextPage": false,
            "startCursor": "cde"
          },
          "nodes": [
            1,
            2,
            3
          ]
        },
        "hasNextPage": false,
        "hasPreviousPage": true,
        "isLoading": false,
        "nextPageUrl": "?direction=next&cursor=abc",
        "nodes": [
          1,
          2,
          3
        ],
        "previousPageUrl": "?direction=previous&cursor=cde"
      }
        </div>
      </DocumentFragment>
    `);
  });
});

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
