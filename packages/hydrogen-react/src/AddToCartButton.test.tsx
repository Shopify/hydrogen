import {vi} from 'vitest';
import {CartProvider} from './CartProvider.js';
import {render, screen, waitFor} from '@testing-library/react';
import {ProductProvider} from './ProductProvider.js';
import {AddToCartButton} from './AddToCartButton.js';
import {getProduct, getVariant} from './ProductProvider.test.helpers.js';
import {getCartMock} from './CartProvider.test.helpers.js';
import userEvent from '@testing-library/user-event';

const mockLinesAdd = vi.fn();

vi.mock('./CartProvider', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('./CartProvider')),
  useCart: () => ({
    linesAdd: mockLinesAdd,
  }),
}));

function MockWrapper({
  children,
  data: product,
  initialVariantId,
}: React.PropsWithChildren &
  Partial<React.ComponentProps<typeof ProductProvider>>) {
  const cart = getCartMock();
  const mockProduct = getProduct();

  return (
    <ProductProvider
      data={{...mockProduct, ...product}}
      initialVariantId={initialVariantId}
    >
      <CartProvider data={cart}>{children}</CartProvider>
    </ProductProvider>
  );
}

describe('<AddToCartButton/>', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a button', () => {
    render(
      <MockWrapper>
        <AddToCartButton variantId="123">Add to cart</AddToCartButton>
      </MockWrapper>
    );

    expect(screen.getByRole('button')).toHaveTextContent('Add to cart');
  });

  it('allows passthrough props', () => {
    render(
      <MockWrapper>
        <AddToCartButton variantId="123" className="bg-blue-600">
          Add to cart
        </AddToCartButton>
      </MockWrapper>
    );

    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
  });

  describe('when variantId is set explicity', () => {
    it('renders a disabled button if the variantId is null', () => {
      render(
        <MockWrapper>
          <AddToCartButton variantId={null}>Add to cart</AddToCartButton>
        </MockWrapper>
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('calls linesAdd with the variantId', async () => {
      const id = '123';
      const user = userEvent.setup();

      render(
        <MockWrapper>
          <AddToCartButton variantId={id}>Add to cart</AddToCartButton>
        </MockWrapper>
      );

      await user.click(screen.getByRole('button'));

      expect(mockLinesAdd).toHaveBeenCalledTimes(1);
      expect(mockLinesAdd).toHaveBeenCalledWith([
        expect.objectContaining({
          merchandiseId: id,
        }),
      ]);
    });
  });

  describe('when inside a ProductProvider', () => {
    describe('and an initialVariantId is present', () => {
      it('calls linesAdd with the initialVariantId', async () => {
        const product = getProduct();
        const selectedVariant = product?.variants?.nodes?.[0];
        const user = userEvent.setup();

        render(
          <MockWrapper data={product} initialVariantId={selectedVariant?.id}>
            <AddToCartButton>Add to cart</AddToCartButton>
          </MockWrapper>
        );

        await user.click(screen.getByRole('button'));

        expect(mockLinesAdd).toHaveBeenCalledTimes(1);
        expect(mockLinesAdd).toHaveBeenCalledWith([
          expect.objectContaining({
            merchandiseId: selectedVariant?.id,
          }),
        ]);
      });
    });

    describe('and the initialVariantId is omitted', () => {
      it('calls linesAdd with the first available variant', async () => {
        const product = getProduct({
          variants: {
            nodes: [
              getVariant({
                availableForSale: true,
                id: 'some variant id',
              }),
            ],
          },
        });
        const user = userEvent.setup();

        render(
          <MockWrapper data={product}>
            <AddToCartButton>Add to cart</AddToCartButton>
          </MockWrapper>
        );

        await user.click(screen.getByRole('button'));

        expect(mockLinesAdd).toHaveBeenCalledTimes(1);
        expect(mockLinesAdd).toHaveBeenCalledWith([
          expect.objectContaining({
            merchandiseId: 'some variant id',
          }),
        ]);
      });
    });

    describe('and the initialVariantId is explicity set to null', () => {
      it('disables the button', () => {
        const product = getProduct();

        render(
          <MockWrapper data={product} initialVariantId={null}>
            <AddToCartButton>Add to cart</AddToCartButton>
          </MockWrapper>
        );

        expect(screen.getByRole('button')).toBeDisabled();
      });
    });

    describe('when the button is clicked', () => {
      it('disables the button', async () => {
        const user = userEvent.setup();

        render(
          <MockWrapper>
            <AddToCartButton variantId="123">Add to cart</AddToCartButton>
          </MockWrapper>
        );

        await user.click(screen.getByRole('button'));

        await waitFor(() => {
          expect(screen.getByRole('button')).toBeDisabled();
        });
      });

      it('renders a message for screen readers when an accessible label is provided', async () => {
        const user = userEvent.setup();

        render(
          <MockWrapper>
            <AddToCartButton
              accessibleAddingToCartLabel="Adding product to your cart"
              variantId="123"
            >
              Add to cart
            </AddToCartButton>
          </MockWrapper>
        );

        await user.click(screen.getByRole('button'));

        await waitFor(() => {
          expect(screen.getByRole('alert')).toHaveTextContent(
            'Adding product to your cart'
          );
        });
      });
    });
  });
});
