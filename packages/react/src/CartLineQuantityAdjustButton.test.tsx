import {render, screen} from '@testing-library/react';
import {useCart, CartProvider} from './CartProvider.js';
import {
  CART_LINE,
  CART_WITH_LINES_FLATTENED,
  getCartWithActionsMock,
} from './CartProvider.test.helpers.js';
import {CartLineProvider} from './CartLineProvider.js';
import {CartLineQuantity} from './CartLineQuantity.js';
import {CartLineQuantityAdjustButton} from './CartLineQuantityAdjustButton.js';
import userEvent from '@testing-library/user-event';

vi.mock('./CartProvider');

describe('CartLineQuantityAdjustButton', () => {
  it('increases quantity', async () => {
    const linesUpdateMock = vi.fn();

    vi.mocked(useCart).mockImplementation(() =>
      getCartWithActionsMock({
        linesUpdate: linesUpdateMock,
        lines: [CART_LINE],
      })
    );

    const user = userEvent.setup();

    render(
      <Cart>
        <CartLineQuantityAdjustButton adjust="increase">
          Increase
        </CartLineQuantityAdjustButton>
      </Cart>,
      {
        wrapper: CartProvider,
      }
    );

    expect(screen.getByTestId(QUANTITY_TEST_ID)).toHaveTextContent(
      (CART_LINE?.quantity ?? 0).toString()
    );

    await user.click(screen.getByRole('button'));

    expect(linesUpdateMock).toHaveBeenCalledWith([
      {
        id: CART_LINE.id,
        quantity: 2,
        attributes: [
          {
            key: 'color',
            value: 'red',
          },
        ],
      },
    ]);
  });

  it('decreases quantity when quantity >= 2', async () => {
    const linesUpdateMock = vi.fn();
    const user = userEvent.setup();

    const tempCartLine = {
      ...CART_WITH_LINES_FLATTENED['lines'][0],
      quantity: 2,
    };

    vi.mocked(useCart).mockImplementation(() =>
      getCartWithActionsMock({
        linesUpdate: linesUpdateMock,
        lines: [tempCartLine],
      })
    );

    render(
      <Cart>
        <CartLineQuantityAdjustButton adjust="decrease">
          Increase
        </CartLineQuantityAdjustButton>
      </Cart>,
      {
        wrapper: CartProvider,
      }
    );

    expect(screen.getByTestId(QUANTITY_TEST_ID)).toHaveTextContent(
      (tempCartLine?.quantity ?? 0).toString()
    );

    await user.click(screen.getByRole('button'));

    expect(linesUpdateMock).toHaveBeenCalledWith([
      {
        id: CART_LINE.id,
        quantity: 1,
        attributes: [
          {
            key: 'color',
            value: 'red',
          },
        ],
      },
    ]);
  });

  it('decreases quantity and removes the line when quantity === 1', async () => {
    const linesRemoveMock = vi.fn();
    const user = userEvent.setup();

    const tempCartLine = {
      ...CART_WITH_LINES_FLATTENED['lines'][0],
      quantity: 1,
    };

    vi.mocked(useCart).mockImplementation(() =>
      getCartWithActionsMock({
        linesRemove: linesRemoveMock,
        lines: [tempCartLine],
      })
    );

    render(
      <Cart>
        <CartLineQuantityAdjustButton adjust="decrease">
          Increase
        </CartLineQuantityAdjustButton>
      </Cart>,
      {
        wrapper: CartProvider,
      }
    );

    expect(screen.getByTestId(QUANTITY_TEST_ID)).toHaveTextContent(
      (tempCartLine?.quantity ?? 0).toString()
    );

    await user.click(screen.getByRole('button'));

    expect(linesRemoveMock).toHaveBeenCalledWith([CART_LINE.id]);
  });

  it('removes the line', async () => {
    const linesRemoveMock = vi.fn();
    const user = userEvent.setup();

    vi.mocked(useCart).mockImplementation(() =>
      getCartWithActionsMock({
        linesRemove: linesRemoveMock,
        lines: [CART_LINE],
      })
    );

    render(
      <Cart>
        <CartLineQuantityAdjustButton adjust="remove">
          Increase
        </CartLineQuantityAdjustButton>
      </Cart>,
      {
        wrapper: CartProvider,
      }
    );

    expect(screen.getByTestId(QUANTITY_TEST_ID)).toHaveTextContent(
      (CART_LINE?.quantity ?? 0).toString()
    );

    await user.click(screen.getByRole('button'));

    expect(linesRemoveMock).toHaveBeenCalledWith([CART_LINE.id]);
  });
});

const QUANTITY_TEST_ID = 'quantity';

function Cart({children}: {children: React.ReactNode}) {
  const {lines} = useCart();

  if (!lines) {
    throw new Error('No lines found in cart.');
  }

  return (
    <ul>
      {lines.map((line) => {
        if (!line) throw new Error('no line');
        return (
          <li key={line?.id}>
            <CartLineProvider line={line}>
              <CartLineQuantity data-testid={QUANTITY_TEST_ID} />
              {children}
            </CartLineProvider>
          </li>
        );
      })}
    </ul>
  );
}
