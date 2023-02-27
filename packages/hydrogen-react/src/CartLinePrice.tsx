import {Money, type MoneyPropsBase} from './Money.js';
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
 * @deprecated Use `Money` instead. To migrate, use the `priceType` prop that matches the corresponding property on the `CartLine` object:
 * - `regular`: `cartLine.cost.totalAmount`
 * - `compareAt`: `cartLine.cost.compareAtAmountPerQuantity`
 *
 * For example:
 * ```
 * // before
 * <CartLinePrice data={cartLine} priceType="regular" />
 * // after
 * <Money data={cartLine.cost.totalAmount} />
 * ```
 *
 * The `CartLinePrice` component renders a `Money` component for the cart line merchandise's price or compare at price.
 */
export function CartLinePrice(props: CartLinePriceProps): JSX.Element | null {
  if (__HYDROGEN_DEV__) {
    console.warn(`<CartLinePrice/> is deprecated; use <Money/> instead.`);
  }

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

// This is only for documenation purposes, and it is not used in the code.
export interface CartLinePricePropsForDocs<
  AsType extends React.ElementType = 'div'
> extends Omit<MoneyPropsBase<AsType>, 'data'>,
    CartLinePricePropsBase {}
