import {render, screen} from '@testing-library/react';
import {CartProvider} from './CartProvider.js';
import {CART_WITH_LINES} from './CartProvider.test.helpers.js';
import {CartCost} from './CartCost.js';
import {ComponentProps, PropsWithChildren} from 'react';
import {ShopifyProvider} from './ShopifyProvider.js';
import {getShopifyConfig} from './ShopifyProvider.test.js';

const testId = 'cart-cost';

function ShopifyCartProvider(
  props: Omit<ComponentProps<typeof CartProvider>, 'children'> = {}
) {
  return function Wrapper({children}: PropsWithChildren) {
    return (
      <ShopifyProvider shopifyConfig={getShopifyConfig()}>
        <CartProvider {...props}>{children}</CartProvider>
      </ShopifyProvider>
    );
  };
}

describe('<CartCost />', () => {
  it('renders total cost', () => {
    render(<CartCost />, {
      wrapper: ShopifyCartProvider({data: CART_WITH_LINES}),
    });

    expect(
      screen.getByText(`CA$${CART_WITH_LINES.cost?.totalAmount?.amount}`)
    ).toBeInTheDocument();
  });

  it('does not render when no estimated cost', () => {
    render(<CartCost data-testid={testId} />, {
      wrapper: ShopifyCartProvider(),
    });

    expect(screen.queryByTestId('cart-cost')).toBeNull();
  });

  it('renders a totalAmount when total is the amountType', () => {
    render(<CartCost amountType="total" />, {
      wrapper: ShopifyCartProvider({data: CART_WITH_LINES}),
    });

    expect(
      screen.getByText(`CA$${CART_WITH_LINES.cost?.totalAmount?.amount}`)
    ).toBeInTheDocument();
  });

  it('renders a subtotalAmount when subtotal is the amountType', () => {
    render(<CartCost amountType="subtotal" />, {
      wrapper: ShopifyCartProvider({data: CART_WITH_LINES}),
    });

    expect(
      screen.getByText(`CA$${CART_WITH_LINES.cost?.subtotalAmount?.amount}`)
    ).toBeInTheDocument();
  });

  it('renders a totalTaxAmount when tax is the amountType', () => {
    render(<CartCost amountType="tax" />, {
      wrapper: ShopifyCartProvider({data: CART_WITH_LINES}),
    });

    expect(
      screen.getByText(`CA$${CART_WITH_LINES.cost?.totalTaxAmount?.amount}`)
    ).toBeInTheDocument();
  });

  it('renders a totalDutyAmount when duty is the amountType', () => {
    render(<CartCost amountType="duty" />, {
      wrapper: ShopifyCartProvider({data: CART_WITH_LINES}),
    });

    expect(
      screen.getByText(`CA$${CART_WITH_LINES.cost?.totalDutyAmount?.amount}`)
    ).toBeInTheDocument();
  });
});
