import {VariantSelector, getSelectedProductOptions} from './VariantSelector';
import {createElement} from 'react';
import {cleanup, render} from '@testing-library/react';
import {describe, it, expect, afterEach, vi, afterAll} from 'vitest';
import {type LinkProps, useLocation} from '@remix-run/react';
import type {ProductVariant} from '@shopify/hydrogen-react/storefront-api-types';

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
  const consoleWarnSpy = vi.spyOn(console, 'warn');

  afterEach(() => {
    consoleWarnSpy.mockClear();
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
          {name: 'Color', optionValues: [{name: 'Red'}, {name: 'Blue'}]},
          {name: 'Size', optionValues: [{name: 'S'}, {name: 'M'}]},
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

  it('accepts deprecated product.options.values and logs a warning', () => {
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

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[h2:warn:VariantSelector] product.options.values is deprecated. Use product.options.optionValues instead.',
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

  it('accepts deprecated product.options.values, the new product.options.optionValues and does not override the new optionValues', () => {
    const {asFragment} = render(
      createElement(VariantSelector, {
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            values: ['Red', 'Blue'],
            optionValues: [
              {name: 'Red', id: '1'},
              {name: 'Blue', id: '2'},
            ],
          },
          {
            name: 'Size',
            values: ['S', 'M'],
            optionValues: [
              {name: 'S', id: '3'},
              {name: 'M', id: '4'},
            ],
          },
        ],
        children: ({option}) =>
          createElement(
            'div',
            null,
            option.values.map(({value, to, optionValue}) =>
              createElement(
                'a',
                {key: option.name + value, href: to, 'data-id': optionValue.id},
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
            data-id="1"
            href="/products/snowboard?Color=Red"
          >
            Red
          </a>
          <a
            data-id="2"
            href="/products/snowboard?Color=Blue"
          >
            Blue
          </a>
        </div>
        <div>
          <a
            data-id="3"
            href="/products/snowboard?Size=S"
          >
            S
          </a>
          <a
            data-id="4"
            href="/products/snowboard?Size=M"
          >
            M
          </a>
        </div>
      </DocumentFragment>
    `);
  });

  it('uses a custom product path', () => {
    const {asFragment} = render(
      createElement(VariantSelector, {
        handle: 'snowboard',
        productPath: 'shop',
        options: [
          {name: 'Color', optionValues: [{name: 'Red'}, {name: 'Blue'}]},
          {name: 'Size', optionValues: [{name: 'S'}, {name: 'M'}]},
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
            href="/shop/snowboard?Color=Red"
          >
            Red
          </a>
          <a
            href="/shop/snowboard?Color=Blue"
          >
            Blue
          </a>
        </div>
        <div>
          <a
            href="/shop/snowboard?Size=S"
          >
            S
          </a>
          <a
            href="/shop/snowboard?Size=M"
          >
            M
          </a>
        </div>
      </DocumentFragment>
    `);
  });

  it('uses a custom product path with leading slash', () => {
    const {asFragment} = render(
      createElement(VariantSelector, {
        handle: 'snowboard',
        productPath: '/shop',
        options: [
          {name: 'Color', optionValues: [{name: 'Red'}, {name: 'Blue'}]},
          {name: 'Size', optionValues: [{name: 'S'}, {name: 'M'}]},
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
            href="/shop/snowboard?Color=Red"
          >
            Red
          </a>
          <a
            href="/shop/snowboard?Color=Blue"
          >
            Blue
          </a>
        </div>
        <div>
          <a
            href="/shop/snowboard?Size=S"
          >
            S
          </a>
          <a
            href="/shop/snowboard?Size=M"
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
          {name: 'Color', optionValues: [{name: 'Red'}]},
          {name: 'Size', optionValues: [{name: 'S'}, {name: 'M'}]},
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
            href="/en-us/products/snowboard?Color=Red"
          >
            Red
          </a>
        </div>
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
          {name: 'Color', optionValues: [{name: 'Red'}]},
          {name: 'Size', optionValues: [{name: 'S'}, {name: 'M'}]},
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
            href="/products/snowboard?Color=Red"
          >
            Red
          </a>
        </div>
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
        options: [{name: 'Size', optionValues: [{name: 'S'}, {name: 'M'}]}],
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
        options: [{name: 'Size', optionValues: [{name: 'S'}, {name: 'M'}]}],
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
        options: [{name: 'Size', optionValues: [{name: 'S'}, {name: 'M'}]}],
        variants: {
          nodes: [
            {
              availableForSale: true,
              selectedOptions: [{name: 'Size', value: 'S'}],
            } as ProductVariant,
            {
              availableForSale: false,
              selectedOptions: [{name: 'Size', value: 'M'}],
            } as ProductVariant,
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

  it('returns variant in option values', () => {
    const {asFragment} = render(
      createElement(VariantSelector, {
        handle: 'snowboard',
        options: [{name: 'Size', optionValues: [{name: 'S'}, {name: 'M'}]}],
        variants: {
          nodes: [
            {
              availableForSale: true,
              sku: 'ABC-01234',
              selectedOptions: [{name: 'Size', value: 'S'}],
            } as ProductVariant,
            {
              availableForSale: true,
              sku: 'XYZ-56789',
              selectedOptions: [{name: 'Size', value: 'M'}],
            } as ProductVariant,
          ],
        },
        children: ({option}) =>
          createElement(
            'div',
            null,
            option.values.map(({value, to, isAvailable, variant}) =>
              createElement(
                'a',
                {
                  key: option.name + value,
                  href: to,
                  className: isAvailable ? 'available' : 'unavailable',
                },
                value,
                createElement('br', null),
                variant && `SKU: ${variant?.sku}`,
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
            <br />
            SKU: ABC-01234
          </a>
          <a
            class="available"
            href="/products/snowboard?Size=M"
          >
            M
            <br />
            SKU: XYZ-56789
          </a>
        </div>
      </DocumentFragment>
    `);
  });
});
