import {Money, type MoneyPropsBase} from './Money.js';
import {useCart} from './CartProvider.js';

type CartCostPropsDeprecated = Omit<
  React.ComponentProps<typeof Money>,
  'data'
> & {
  /**
   * @deprecated Tax and duty amounts are no longer available and will be removed in a future version.
   * Please see [the changelog](https://shopify.dev/changelog/tax-and-duties-are-deprecated-in-storefront-cart-api) for more information.
   */
  amountType?: 'tax' | 'duty';
  /** Any `ReactNode` elements. */
  children?: React.ReactNode;
};

type CartCostPropsBase = Omit<React.ComponentProps<typeof Money>, 'data'> & {
  /** A string type that defines the type of cost needed. Valid values: `total`, `subtotal`, `tax`, or `duty`.
   */
  amountType?: 'total' | 'subtotal';
  /** Any `ReactNode` elements. */
  children?: React.ReactNode;
};

type CartCostProps = CartCostPropsBase | CartCostPropsDeprecated;

/**
 * The `CartCost` component renders a `Money` component with the cost associated with the `amountType` prop.
 * If no `amountType` prop is specified, then it defaults to `totalAmount`.
 * Depends on `useCart()` and must be a child of `<CartProvider/>`
 */
export function CartCost(props: CartCostPropsBase): JSX.Element | null;
export function CartCost(props: CartCostPropsDeprecated): JSX.Element | null;
export function CartCost(props: CartCostProps): JSX.Element | null {
  const {cost} = useCart();
  const {amountType = 'total', children, ...passthroughProps} = props;
  let amount;

  if (amountType == 'total') {
    amount = cost?.totalAmount;
  } else if (amountType == 'subtotal') {
    amount = cost?.subtotalAmount;
  } else if (amountType == 'tax') {
    amount = cost?.totalTaxAmount;
  } else if (amountType == 'duty') {
    amount = cost?.totalDutyAmount;
  }

  if (amount == null) {
    return null;
  }

  return (
    <Money {...passthroughProps} data={amount}>
      {children}
    </Money>
  );
}

// This is only for documentation purposes, and it is not used in the code.
export type CartCostPropsForDocs<AsType extends React.ElementType = 'div'> =
  Omit<MoneyPropsBase<AsType>, 'data'> & CartCostPropsBase;
