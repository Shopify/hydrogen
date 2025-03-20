import {describe, expect, it} from 'vitest';

import {ProductProvider, useProduct} from './ProductProvider.js';
import {
  getProduct,
  VARIANTS,
  VARIANTS_WITH_SELLING_PLANS,
  SELLING_PLAN_GROUPS_CONNECTION,
} from './ProductProvider.test.helpers.js';
import {render, screen, renderHook, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('<ProductProvider />', () => {
  it('renders its children', () => {
    const prod = getProduct();
    render(
      <ProductProvider data={prod} initialVariantId="">
        <span>Hello world</span>
      </ProductProvider>,
    );

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('returns a structured list of options and values', () => {
    const {result} = renderHook(() => useProduct(), {
      wrapper: ({children}) => (
        <ProductProvider data={getProduct({variants: VARIANTS})}>
          {children}
        </ProductProvider>
      ),
    });

    expect(result.current.options).toEqual([
      {
        name: 'Color',
        values: ['Black', 'White'],
      },
      {
        name: 'Size',
        values: ['Small', 'Large'],
      },
    ]);
  });

  it('returns full product', () => {
    const product = getProduct({variants: VARIANTS});
    const {result} = renderHook(() => useProduct(), {
      wrapper: ({children}) => (
        <ProductProvider data={product}>{children}</ProductProvider>
      ),
    });

    expect(result.current.product).toEqual(product);
  });

  it('provides setSelectedOption callback', async () => {
    const user = userEvent.setup();

    function Component() {
      const {options, setSelectedOption, selectedOptions} = useProduct();
      return (
        <>
          <ul>
            {options?.map((option) => (
              <li key={option?.name}>
                <ul>
                  {option?.values?.map((value) => (
                    <li key={value}>
                      <button
                        onClick={() =>
                          setSelectedOption(option?.name ?? '', value ?? '')
                        }
                      >
                        {value}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div>{JSON.stringify(selectedOptions)}</div>
        </>
      );
    }

    const prod = getProduct({variants: VARIANTS});

    render(
      <ProductProvider data={prod}>
        <Component />
      </ProductProvider>,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await act(() => user.click(screen.getByRole('button', {name: 'White'})));

    expect(
      screen.getByText(JSON.stringify({Color: 'White', Size: 'Small'})),
    ).toBeInTheDocument();
  });

  it('computes selected options based on initial selected variant', () => {
    const prod = getProduct({
      variants: VARIANTS,
    });

    const {result} = renderHook(() => useProduct(), {
      wrapper: ({children}) => (
        <ProductProvider data={prod} initialVariantId={VARIANTS.nodes?.[0]?.id}>
          {children}
        </ProductProvider>
      ),
    });

    expect(result.current.selectedOptions).toEqual({
      Color: 'Black',
      Size: 'Small',
    });
  });

  it('provides list of variants', () => {
    const prod = getProduct({variants: VARIANTS});

    const {result} = renderHook(() => useProduct(), {
      wrapper: ({children}) => (
        <ProductProvider data={prod} initialVariantId={VARIANTS.nodes?.[0]?.id}>
          {children}
        </ProductProvider>
      ),
    });

    expect(result.current.variants).toEqual(VARIANTS.nodes);
  });

  it('provides setSelectedVariant callback', async () => {
    const user = userEvent.setup();

    function Component() {
      const {variants, selectedVariant, setSelectedVariant} = useProduct();

      return (
        <>
          <select
            name="variant"
            data-testid="variant"
            value={selectedVariant?.id}
            onChange={(e) => {
              setSelectedVariant(
                // for some reason, 'e.target.value' is always null in this testing env. So we just set it to the one we want it to be for now
                variants?.find((v) => v?.id === e.target.value) ??
                  variants?.[1] ??
                  null,
              );
            }}
          >
            {variants?.map((variant) => (
              <option key={variant?.id} value={variant?.id}>
                {variant?.title}
              </option>
            ))}
          </select>
          <div>{JSON.stringify(selectedVariant)}</div>
        </>
      );
    }

    render(
      <ProductProvider data={getProduct({variants: VARIANTS})}>
        <Component />
      </ProductProvider>,
    );

    expect(
      screen.getByText(JSON.stringify(VARIANTS.nodes?.[0])),
    ).toBeInTheDocument();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await act(() =>
      user.selectOptions(screen.getByTestId('variant'), [
        VARIANTS.nodes?.[1]?.id ?? '2',
      ]),
    );

    expect(
      screen.getByText(JSON.stringify(VARIANTS.nodes?.[1])),
    ).toBeInTheDocument();
  });

  it('allows setSelectedVariant to be called with null to deselect', async () => {
    const user = userEvent.setup();

    function Component() {
      const {selectedVariant, setSelectedVariant} = useProduct();

      return (
        <>
          <label htmlFor="variant">Variant</label>
          <button onClick={() => setSelectedVariant(null)}>Unselect</button>
          <div>{JSON.stringify(selectedVariant)}</div>
        </>
      );
    }

    render(
      <ProductProvider data={getProduct({variants: VARIANTS})}>
        <Component />
      </ProductProvider>,
    );

    expect(
      screen.getByText(JSON.stringify(VARIANTS.nodes?.[0])),
    ).toBeInTheDocument();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await act(() => user.click(screen.getByRole('button')));

    expect(screen.getByText('null')).toBeInTheDocument();
  });

  it('provides out of stock helper', async () => {
    const user = userEvent.setup();

    function Component() {
      const {options, setSelectedOption, isOptionInStock} = useProduct();

      return (
        <>
          <ul>
            {options?.map((option) => (
              <li key={option?.name}>
                <ul>
                  {option?.values?.map((value) => (
                    <li key={value}>
                      <button
                        onClick={() =>
                          setSelectedOption(option?.name ?? '', value ?? '')
                        }
                      >
                        {`${value ?? ''}${
                          !isOptionInStock(option?.name ?? '', value ?? '')
                            ? ' (out of stock)'
                            : ''
                        }`}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      );
    }

    const prod = getProduct({variants: VARIANTS});

    render(
      <ProductProvider data={prod} initialVariantId="">
        <Component />
      </ProductProvider>,
    );

    expect(screen.getByRole('button', {name: 'White'})).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: 'White (out of stock)'}),
    ).not.toBeInTheDocument();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await act(() => user.click(screen.getByRole('button', {name: 'Large'})));

    expect(
      screen.queryByRole('button', {name: 'White (out of stock)'}),
    ).toBeInTheDocument();
  });

  it('supports selecting a selling plan', async () => {
    const user = userEvent.setup();

    function Component() {
      const {
        setSelectedSellingPlan,
        selectedSellingPlan,
        selectedSellingPlanAllocation,
        sellingPlanGroups,
      } = useProduct();

      return (
        <>
          {(sellingPlanGroups ?? []).map((sellingPlanGroup) => {
            return (
              <div key={sellingPlanGroup?.name}>
                <h2>{sellingPlanGroup?.name}</h2>
                <ul>
                  {sellingPlanGroup?.sellingPlans?.map((sellingPlan) => {
                    if (!sellingPlan) {
                      return;
                    }
                    return (
                      <li key={sellingPlan?.id}>
                        <button
                          onClick={() => {
                            setSelectedSellingPlan(sellingPlan);
                          }}
                        >
                          {sellingPlan?.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {selectedSellingPlan ? (
            <div data-testid="selectedSellingPlan">
              {JSON.stringify(selectedSellingPlan)}
            </div>
          ) : null}
          {selectedSellingPlanAllocation ? (
            <div data-testid="selectedSellingPlanAllocation">
              {JSON.stringify(selectedSellingPlanAllocation)}
            </div>
          ) : null}
        </>
      );
    }

    const prod = getProduct({
      variants: VARIANTS_WITH_SELLING_PLANS,
      sellingPlanGroups: SELLING_PLAN_GROUPS_CONNECTION,
    });

    render(
      <ProductProvider
        data={prod}
        initialVariantId={VARIANTS_WITH_SELLING_PLANS.nodes?.[0]?.id}
      >
        <Component />
      </ProductProvider>,
    );

    expect(screen.queryByTestId('selectedSellingPlan')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('selectedSellingPlanAllocation'),
    ).not.toBeInTheDocument();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await act(() =>
      user.click(screen.getByRole('button', {name: 'Deliver every week'})),
    );

    const selectedSellingPlanElement = screen.getByTestId(
      'selectedSellingPlan',
    );
    const selectedSellingPlanAllocationElement = screen.getByTestId(
      'selectedSellingPlanAllocation',
    );

    expect(selectedSellingPlanElement).toBeInTheDocument();
    expect(selectedSellingPlanElement).not.toBeEmptyDOMElement();
    expect(selectedSellingPlanAllocationElement).toBeInTheDocument();
    expect(selectedSellingPlanAllocationElement).not.toBeEmptyDOMElement();
  });
});
