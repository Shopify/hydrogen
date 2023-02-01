import {useMoney} from '@shopify/hydrogen-react';

export function MyComponent() {
  const {currencyCode, currencySymbol, amount} = useMoney(variant.pricev2);

  return (
    <div>
      <strong>{currencyCode}</strong>
      <span>{currencySymbol}</span>
      <span>{amount}</span>
    </div>
  );
}
