import {render, screen} from '@testing-library/react';
import {CartLinePrice} from './CartLinePrice.js';
import {getCartLineMock} from './CartProvider.test.helpers.js';

describe('<CartLinePrice />', () => {
  it('renders <Money /> with the regular price by default', () => {
    const line = getCartLineMock({
      cost: {
        totalAmount: {
          amount: '50',
          currencyCode: 'USD',
        },
      },
    });

    render(<CartLinePrice data={line} />);

    expect(screen.getByText('50', {exact: false})).toBeInTheDocument();
  });

  it('renders <Money /> with the compareAt price when `priceType` is `compareAt`', () => {
    const line = getCartLineMock({
      cost: {
        compareAtAmountPerQuantity: {
          amount: '60',
          currencyCode: 'USD',
        },
      },
    });

    render(<CartLinePrice data={line} priceType="compareAt" />);

    expect(screen.getByText('60', {exact: false})).toBeInTheDocument();
  });

  it('allows passthrough props', () => {
    const line = getCartLineMock({
      cost: {
        totalAmount: {
          amount: '50',
          currencyCode: 'USD',
        },
      },
    });

    render(<CartLinePrice data={line} className="underline" />);

    const money = screen.getByText('50', {exact: false});

    expect(money).toBeInTheDocument();
    expect(money).toHaveClass('underline');
  });
});
