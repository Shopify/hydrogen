import {Money, type MoneyPropsBase} from './Money.js';
import {useCart} from './CartProvider.js';

interface CartCostPropsBase {
  /** A string type that defines the type of cost needed. Valid values: `total`, `subtotal`, `tax`, or `duty`. */
  amountType?: 'total' | 'subtotal' | 'tax' | 'duty';
  /** Any `ReactNode` elements. */
  children?: React.ReactNode;
}

type CartCostProps = Omit<React.ComponentProps<typeof Money>, 'data'> &
  CartCostPropsBase;

/**
 * The `CartCost` component renders a `Money` component with the cost associated with the `amountType` prop.
 * If no `amountType` prop is specified, then it defaults to `totalAmount`.
 * Depends on `useCart()` and must be a child of `<CartProvider/>`
 */
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

// This is only for documenation purposes, and it is not used in the code.
export interface CartCostPropsForDocs<AsType extends React.ElementType = 'div'>
  extends Omit<MoneyPropsBase<AsType>, 'data'>,
    CartCostPropsBase {}
