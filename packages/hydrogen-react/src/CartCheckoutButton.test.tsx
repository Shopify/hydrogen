import {vi, afterEach, describe, it, expect} from 'vitest';
import {render, screen, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {CartCheckoutButton} from './CartCheckoutButton.js';

const checkoutUrl = 'https://shopify.com/checkout';

vi.doMock('./CartProvider', async () => ({
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await act(() => user.click(screen.getByRole('button')));

    expect(window.location.href).toBe(checkoutUrl);
  });
});
