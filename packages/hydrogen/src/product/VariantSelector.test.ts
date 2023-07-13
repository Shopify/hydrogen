import {
  VariantSelector,
  getFirstAvailableVariant,
  getSelectedProductOptions,
  useVariantUrl,
} from './VariantSelector';
import {createElement} from 'react';
import {cleanup, render} from '@testing-library/react';
import {describe, it, expect, afterEach, vi, afterAll} from 'vitest';
import {type LinkProps, useLocation} from '@remix-run/react';

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

describe('getFirstAvailableVariant', () => {
  it('returns the first available variant', () => {
    expect(
      getFirstAvailableVariant([
        {
          availableForSale: false,
          selectedOptions: [{name: 'Color', value: 'Red'}],
        },
        {
          availableForSale: true,
          selectedOptions: [{name: 'Color', value: 'Blue'}],
        },
      ]),
    ).toEqual({
      availableForSale: true,
      selectedOptions: [{name: 'Color', value: 'Blue'}],
    });
  });

  it('returns the first available variant from a connection', () => {
    expect(
      getFirstAvailableVariant({
        nodes: [
          {
            availableForSale: false,
            selectedOptions: [{name: 'Color', value: 'Red'}],
          },
          {
            availableForSale: true,
            selectedOptions: [{name: 'Color', value: 'Blue'}],
          },
        ],
      }),
    ).toEqual({
      availableForSale: true,
      selectedOptions: [{name: 'Color', value: 'Blue'}],
    });
  });
});

describe('getSelectedProductOptions', () => {
  it('returns the selected options', () => {
    const req = new Request('https://localhost:8080/?Color=Red&Size=S');
    expect(getSelectedProductOptions(req)).toEqual([
      {name: 'Color', value: 'Red'},
      {name: 'Size', value: 'S'},
    ]);
  });
});

describe('<VariantSelector>', () => {
  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  it('passes value and path for each variant permutation', () => {
    const {asFragment} = render(
      createElement(VariantSelector, {
        handle: 'snowboard',
        options: [
          {name: 'Color', values: ['Red', 'Blue']},
          {name: 'Size', values: ['S', 'M']},
        ],
        children: ({option}) =>
          createElement(
            'div',
            null,
            option.values.map(({value, to}) =>
              createElement('a', {key: option.name + value, href: to}, value),
            ),
          ),
      }),
    );

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          <a
            href="/products/snowboard?Color=Red"
          >
            Red
          </a>
          <a
            href="/products/snowboard?Color=Blue"
          >
            Blue
          </a>
        </div>
        <div>
          <a
            href="/products/snowboard?Size=S"
          >
            S
          </a>
          <a
            href="/products/snowboard?Size=M"
          >
            M
          </a>
        </div>
      </DocumentFragment>
    `);
  });

  it('automatically appends options with only one value to the URL', () => {
    const {asFragment} = render(
      createElement(VariantSelector, {
        handle: 'snowboard',
        options: [
          {name: 'Color', values: ['Red']},
          {name: 'Size', values: ['S', 'M']},
        ],
        children: ({option}) =>
          createElement(
            'div',
            null,
            option.values.map(({value, to}) =>
              createElement('a', {key: option.name + value, href: to}, value),
            ),
          ),
      }),
    );

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          <a
            href="/products/snowboard?Size=S&Color=Red"
          >
            S
          </a>
          <a
            href="/products/snowboard?Size=M&Color=Red"
          >
            M
          </a>
        </div>
      </DocumentFragment>
    `);
  });

  it('prepends localization', () => {
    vi.mocked(useLocation).mockReturnValueOnce(
      fillLocation({search: '?Size=M', pathname: '/en-us/'}),
    );

    const {asFragment} = render(
      createElement(VariantSelector, {
        handle: 'snowboard',
        options: [
          {name: 'Color', values: ['Red']},
          {name: 'Size', values: ['S', 'M']},
        ],
        children: ({option}) =>
          createElement(
            'div',
            null,
            option.values.map(({value, to, isActive}) =>
              createElement(
                'a',
                {
                  key: option.name + value,
                  href: to,
                  className: isActive ? 'active' : undefined,
                },
                value,
              ),
            ),
          ),
      }),
    );

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          <a
            href="/en-us/products/snowboard?Size=S&Color=Red"
          >
            S
          </a>
          <a
            class="active"
            href="/en-us/products/snowboard?Size=M&Color=Red"
          >
            M
          </a>
        </div>
      </DocumentFragment>
    `);
  });

  it('shows whether or not an option is active', () => {
    vi.mocked(useLocation).mockReturnValueOnce(
      fillLocation({search: '?Size=M'}),
    );

    const {asFragment} = render(
      createElement(VariantSelector, {
        handle: 'snowboard',
        options: [
          {name: 'Color', values: ['Red']},
          {name: 'Size', values: ['S', 'M']},
        ],
        children: ({option}) =>
          createElement(
            'div',
            null,
            option.values.map(({value, to, isActive}) =>
              createElement(
                'a',
                {
                  key: option.name + value,
                  href: to,
                  className: isActive ? 'active' : undefined,
                },
                value,
              ),
            ),
          ),
      }),
    );

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          <a
            href="/products/snowboard?Size=S&Color=Red"
          >
            S
          </a>
          <a
            class="active"
            href="/products/snowboard?Size=M&Color=Red"
          >
            M
          </a>
        </div>
      </DocumentFragment>
    `);
  });

  it('all options default to available', () => {
    const {asFragment} = render(
      createElement(VariantSelector, {
        handle: 'snowboard',
        options: [{name: 'Size', values: ['S', 'M']}],
        children: ({option}) =>
          createElement(
            'div',
            null,
            option.values.map(({value, to, isAvailable}) =>
              createElement(
                'a',
                {
                  key: option.name + value,
                  href: to,
                  className: isAvailable ? 'available' : 'unavailable',
                },
                value,
              ),
            ),
          ),
      }),
    );

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          <a
            class="available"
            href="/products/snowboard?Size=S"
          >
            S
          </a>
          <a
            class="available"
            href="/products/snowboard?Size=M"
          >
            M
          </a>
        </div>
      </DocumentFragment>
    `);
  });

  it('shows products as unavailable', () => {
    const {asFragment} = render(
      createElement(VariantSelector, {
        handle: 'snowboard',
        options: [{name: 'Size', values: ['S', 'M']}],
        variants: [
          {
            availableForSale: true,
            selectedOptions: [{name: 'Size', value: 'S'}],
          },
          {
            availableForSale: false,
            selectedOptions: [{name: 'Size', value: 'M'}],
          },
        ],
        children: ({option}) =>
          createElement(
            'div',
            null,
            option.values.map(({value, to, isAvailable}) =>
              createElement(
                'a',
                {
                  key: option.name + value,
                  href: to,
                  className: isAvailable ? 'available' : 'unavailable',
                },
                value,
              ),
            ),
          ),
      }),
    );

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          <a
            class="available"
            href="/products/snowboard?Size=S"
          >
            S
          </a>
          <a
            class="unavailable"
            href="/products/snowboard?Size=M"
          >
            M
          </a>
        </div>
      </DocumentFragment>
    `);
  });

  it('takes a connection as variants', () => {
    const {asFragment} = render(
      createElement(VariantSelector, {
        handle: 'snowboard',
        options: [{name: 'Size', values: ['S', 'M']}],
        variants: {
          nodes: [
            {
              availableForSale: true,
              selectedOptions: [{name: 'Size', value: 'S'}],
            },
            {
              availableForSale: false,
              selectedOptions: [{name: 'Size', value: 'M'}],
            },
          ],
        },
        children: ({option}) =>
          createElement(
            'div',
            null,
            option.values.map(({value, to, isAvailable}) =>
              createElement(
                'a',
                {
                  key: option.name + value,
                  href: to,
                  className: isAvailable ? 'available' : 'unavailable',
                },
                value,
              ),
            ),
          ),
      }),
    );

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          <a
            class="available"
            href="/products/snowboard?Size=S"
          >
            S
          </a>
          <a
            class="unavailable"
            href="/products/snowboard?Size=M"
          >
            M
          </a>
        </div>
      </DocumentFragment>
    `);
  });
});

describe('getVariantUrl', () => {
  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  it('returns the URL for a product with no options', () => {
    vi.mocked(useLocation).mockReturnValueOnce(fillLocation({}));

    function Test() {
      const {to, search} = useVariantUrl('snowboard', []);

      return createElement('a', {href: to + search});
    }

    const {asFragment} = render(createElement(Test, {}));
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <a
          href="/products/snowboard?"
        />
      </DocumentFragment>
    `);
  });

  it('returns the URL for a product with no options', () => {
    vi.mocked(useLocation).mockReturnValueOnce(fillLocation({}));

    function Test() {
      const {to, search} = useVariantUrl('snowboard', [
        {name: 'Color', value: 'Red'},
        {name: 'Size', value: 'S'},
      ]);

      return createElement('a', {href: to + search});
    }

    const {asFragment} = render(createElement(Test, {}));
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <a
          href="/products/snowboard?Color=Red&Size=S?Color=Red&Size=S"
        />
      </DocumentFragment>
    `);
  });
});
