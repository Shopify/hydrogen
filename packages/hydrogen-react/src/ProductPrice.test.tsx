import {describe, expect, it} from 'vitest';

import {render, screen} from '@testing-library/react';
import {getProduct, getVariant} from './ProductProvider.test.helpers.js';
import {ProductPrice} from './ProductPrice.js';

describe('<ProductPrice />', () => {
  describe('variantId prop is provided', () => {
    it("renders <Money /> with the variant's price", () => {
      const product = getProduct();
      const variant = product?.variants?.nodes?.[0];
      render(<ProductPrice data={product} variantId={variant?.id} />);

      expect(
        screen.getByText(variant?.price?.amount || '', {exact: false}),
      ).toBeInTheDocument();

      expect(
        screen.getByText(variant?.priceV2?.amount || '', {exact: false}),
      ).toBeInTheDocument();
    });

    it("renders <Money /> with the variant's minimum compareAt price", () => {
      const product = getProduct({
        variants: {
          nodes: [
            getVariant({
              price: {
                currencyCode: 'CAD',
                amount: '250.00',
              },
              compareAtPrice: {
                currencyCode: 'CAD',
                amount: '500.00',
              },
            }),
          ],
        },
      });
      const variant = product?.variants?.nodes?.[0];
      render(
        <ProductPrice
          data={product}
          priceType="compareAt"
          variantId={variant?.id}
        />,
      );

      expect(
        screen.getByText(variant?.compareAtPrice?.amount || '', {
          exact: false,
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByText(variant?.compareAtPriceV2?.amount || '', {
          exact: false,
        }),
      ).toBeInTheDocument();
    });

    it('renders <Money /> with unit prices when valueType is `unit`', () => {
      const product = getProduct();
      const variant = product?.variants?.nodes?.[0];
      render(
        <ProductPrice
          data={product}
          valueType="unit"
          variantId={variant?.id}
        />,
      );

      expect(
        screen.getByText(variant?.unitPrice?.amount || '', {exact: false}),
      ).toBeInTheDocument();
    });
  });

  it("renders <Money /> with the product's minimum regular price by default", () => {
    const product = getProduct();
    render(<ProductPrice data={product} />);

    expect(
      screen.getByText(product.priceRange?.minVariantPrice?.amount || '', {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it("renders <Money /> with the product's maximum regular price when `valueType` is `max`", () => {
    const product = getProduct();
    render(<ProductPrice data={product} valueType="max" />);

    expect(
      screen.getByText(product.priceRange?.maxVariantPrice?.amount || '', {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it("renders <Money /> with the product's minimum compareAt price when the `priceType` is `compareAt`", () => {
    const product = getProduct({
      priceRange: {
        minVariantPrice: {
          currencyCode: 'CAD',
          amount: '500.00',
        },
      },
      compareAtPriceRange: {
        minVariantPrice: {
          currencyCode: 'CAD',
          amount: '750.00',
        },
      },
    });
    render(<ProductPrice data={product} priceType="compareAt" />);

    expect(
      screen.getByText(
        product.compareAtPriceRange?.minVariantPrice?.amount || '',
        {exact: false},
      ),
    ).toBeInTheDocument();
  });

  it("renders <Money /> with the product's maximum compareAt price when `valueType` is `max` and `priceType` is `compareAt`", () => {
    const product = getProduct({
      priceRange: {
        maxVariantPrice: {
          currencyCode: 'CAD',
          amount: '500.00',
        },
      },
      compareAtPriceRange: {
        maxVariantPrice: {
          currencyCode: 'CAD',
          amount: '750.00',
        },
      },
    });
    render(
      <ProductPrice data={product} valueType="max" priceType="compareAt" />,
    );

    expect(
      screen.getByText(
        product.compareAtPriceRange?.maxVariantPrice?.amount || '',
        {exact: false},
      ),
    ).toBeInTheDocument();
  });

  it('does not show compareAt price when regular price is larger than compareAt price', () => {
    const product = getProduct({
      priceRange: {
        minVariantPrice: {
          currencyCode: 'CAD',
          amount: '750.00',
        },
      },
      compareAtPriceRange: {
        minVariantPrice: {
          currencyCode: 'CAD',
          amount: '500.00',
        },
      },
    });

    render(<ProductPrice data={product} priceType="compareAt" />);

    expect(
      screen.queryByText(
        product.compareAtPriceRange?.minVariantPrice?.amount ?? '',
        {exact: false},
      ),
    ).toBeNull();
  });

  it('supports passthrough props', () => {
    const product = getProduct();
    render(<ProductPrice data={product} className="emphasized" />);

    expect(
      screen.getByText(product.priceRange?.minVariantPrice?.amount || '', {
        exact: false,
      }),
    ).toHaveClass('emphasized');
  });

  it(`has the correct TS types for itself and for <Money/>`, () => {
    // no errors
    render(<ProductPrice data={getProduct()} />);

    // no errors
    render(
      <ProductPrice
        data={getProduct()}
        priceType="regular"
        valueType="min"
        variantId="test"
      />,
    );

    // @ts-expect-error should error because no 'data' prop
    expect(() => render(<ProductPrice />)).toThrowError('data');

    // @ts-expect-error should error because 'priceType' is wrong
    render(<ProductPrice data={getProduct()} priceType="test" />);

    // @ts-expect-error should error because 'valueType' is wrong
    render(<ProductPrice data={getProduct()} valueType="test" />);

    // @ts-expect-error should error because 'variantId' is wrong
    render(<ProductPrice data={getProduct()} variantId={0} />);

    // @ts-expect-error should error because 'measurement' isn't an accepted prop
    render(<ProductPrice data={getProduct()} measurement="" />);

    // valid 'Money' props
    render(
      <ProductPrice
        data={getProduct()}
        measurementSeparator="---"
        withoutCurrency
        withoutTrailingZeros
        as="span"
      />,
    );
  });
});
