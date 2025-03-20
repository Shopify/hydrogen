import {vi, describe, it, expect} from 'vitest';
import {useCart} from './CartProvider.js';
import {render, screen, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {BuyNowButton} from './BuyNowButton.js';
import {getCartWithActionsMock} from './CartProvider.test.helpers.js';

vi.mock('./CartProvider', () => {
  return {
    useCart: vi.fn(() => ({cartCreate: vi.fn()})),
  };
});

describe('<BuyNowButton/>', () => {
  it('renders a button', () => {
    render(<BuyNowButton variantId="1">Buy now</BuyNowButton>);
    expect(screen.getByRole('button')).toHaveTextContent('Buy now');
  });

  it('can optionally disable the button', () => {
    render(
      <BuyNowButton disabled variantId="1">
        Buy now
      </BuyNowButton>,
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('allows pass-through props', () => {
    render(
      <BuyNowButton className="fancy-button" variantId="1">
        Buy now
      </BuyNowButton>,
    );

    expect(screen.getByRole('button')).toHaveClass('fancy-button');
  });

  describe('when the button is clicked', () => {
    it('uses useCartCreateCallback with the correct arguments', async () => {
      const mockCartCreate = vi.fn();

      vi.mocked(useCart).mockImplementation(() =>
        getCartWithActionsMock({
          cartCreate: mockCartCreate,
        }),
      );

      const user = userEvent.setup();

      render(
        <BuyNowButton
          attributes={[
            {key: 'color', value: 'blue'},
            {key: 'size', value: 'large'},
          ]}
          quantity={4}
          variantId="SKU123"
          sellingPlanId="1234"
        >
          Buy now
        </BuyNowButton>,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await act(() => user.click(screen.getByRole('button')));

      expect(mockCartCreate).toHaveBeenCalledTimes(1);
      expect(mockCartCreate).toHaveBeenCalledWith({
        lines: [
          {
            quantity: 4,
            merchandiseId: 'SKU123',
            sellingPlanId: '1234',
            attributes: [
              {key: 'color', value: 'blue'},
              {key: 'size', value: 'large'},
            ],
          },
        ],
      });
    });

    it('disables the button', async () => {
      const user = userEvent.setup();

      render(<BuyNowButton variantId="1">Buy now</BuyNowButton>);

      const button = screen.getByRole('button');

      expect(button).not.toBeDisabled();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await act(() => user.click(button));

      expect(button).toBeDisabled();
    });
  });
});
