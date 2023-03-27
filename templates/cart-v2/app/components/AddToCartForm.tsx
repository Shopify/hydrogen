import {CartAction} from '~/lib/cart/components';
import {QuantityControls} from './Cart';
import {useMatchesData} from '~/lib/cart/hooks';

export function AddToCartForm({selectedVariant}) {
  const data = useMatchesData('root');
  const variant = data?.cartLines[selectedVariant.id];
  const variantInCart = !!variant;

  const formInputs = {
    lines: [
      {
        merchandiseId: selectedVariant.id,
        quantity: 1,
      },
    ],
  };

  return (
    <>
      {variantInCart && (
        <QuantityControls quantity={variant.quantity} line={variant} />
      )}
      {!variantInCart && (
        <CartAction action="LINES_ADD" cartInput={formInputs}>
          {() => <button>Add to cart</button>}
        </CartAction>
      )}
      <CartAction action="LINES_ADD" cartInput={formInputs}>
        {() => (
          <>
            <input
              type="hidden"
              name="optimistic-identifier"
              value={'optimistic-add-to-cart'}
            />
            <input
              type="hidden"
              name="optimistic-data"
              value={JSON.stringify({
                [selectedVariant.id]: {
                  id: `optimistic-${selectedVariant.id}`,
                  quantity: 1,
                  merchandise: {
                    id: selectedVariant.id,
                    product: {
                      handle,
                      title,
                      image,
                    },
                    price: {},
                  },
                },
              })}
            />
            <button>Add to cart</button>
          </>
        )}
      </CartAction>
    </>
  );
}

<CartAction action="LINES_ADD" cartInput={formInputs}>
  {() => (
    <>
      <input
        type="hidden"
        name="optimistic-identifier"
        value={'optimistic-add-to-cart'}
      />
      <input
        type="hidden"
        name="optimistic-data"
        value={JSON.stringify({
          [selectedVariant.id]: {
            id: `optimistic-${selectedVariant.id}`,
            quantity: 1,
            merchandise: {
              id: selectedVariant.id,
              product: {
                title,
                image,
              },
            },
          },
        })}
      />
      <button>Add to cart</button>
    </>
  )}
</CartAction>;
