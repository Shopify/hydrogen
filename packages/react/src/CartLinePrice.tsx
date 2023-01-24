import {Money} from './Money.js';
import {CartLine} from './storefront-api-types.js';
import {PartialDeep} from 'type-fest';

interface CartLinePricePropsBase {
  /** A [CartLine object](https://shopify.dev/api/storefront/reference/objects/CartLine). */
  data: PartialDeep<CartLine, {recurseIntoArrays: true}>;
  /** The type of price. Valid values:`regular` (default) or `compareAt`. */
  priceType?: 'regular' | 'compareAt';
}

type CartLinePriceProps = Omit<React.ComponentProps<typeof Money>, 'data'> &
  CartLinePricePropsBase;

/**
 * The `CartLinePrice` component renders a `Money` component for the cart line merchandise's price or compare at price.
 */
export function CartLinePrice(props: CartLinePriceProps) {
  const {data: cartLine, priceType = 'regular', ...passthroughProps} = props;

  if (cartLine == null) {
    throw new Error(`<CartLinePrice/> requires a cart line as the 'data' prop`);
  }

  const moneyV2 =
    priceType === 'regular'
      ? cartLine.cost?.totalAmount
      : cartLine.cost?.compareAtAmountPerQuantity;

  if (moneyV2 == null) {
    return null;
  }

  return <Money {...passthroughProps} data={moneyV2} />;
}
