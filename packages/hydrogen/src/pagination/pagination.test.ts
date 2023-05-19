import {getPaginationVariables, Pagination} from './Pagination';
import {createElement, Fragment} from 'react';
import {cleanup, render} from '@testing-library/react';
import {describe, it, expect, afterEach, vi, afterAll} from 'vitest';
import type {LinkProps} from '@remix-run/react';

vi.mock('@remix-run/react', () => ({
  useNavigation: vi.fn(() => ({
    state: 'idle',
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
});

describe('<Pagination>', () => {
  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    vi.resetAllMocks();
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
            state="{\\"pageInfo\\":{\\"endCursor\\":\\"abc\\",\\"hasPreviousPage\\":false,\\"startCursor\\":\\"cde\\"},\\"nodes\\":[1,2,3]}"
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
            state="{\\"pageInfo\\":{\\"endCursor\\":\\"abc\\",\\"hasPreviousPage\\":true,\\"startCursor\\":\\"cde\\"},\\"nodes\\":[1,2,3]}"
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
