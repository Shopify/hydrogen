import {CartCheckoutButton} from './CartCheckoutButton.js';

import {vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const checkoutUrl = 'https://shopify.com/checkout';

vi.mock('./CartProvider', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('./CartProvider')),
  useCart: () => ({
    checkoutUrl,
    status: 'idle',
  }),
}));

describe('<CartCheckoutButton/>', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to checkout when clicked', async () => {
    const user = userEvent.setup();

    render(<CartCheckoutButton>Checkout</CartCheckoutButton>);

    Object.defineProperty(window, 'location', {
      value: {
        href: '',
      },
    });

    await user.click(screen.getByRole('button'));

    expect(window.location.href).toBe(checkoutUrl);
  });
});
