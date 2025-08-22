import type {CartWarning} from '@shopify/hydrogen-react/storefront-api-types';

type CartWarningsProps = {
  warnings?: CartWarning[];
};

export function CartWarnings({warnings}: CartWarningsProps) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <div className="cart-warnings" role="alert">
      <h4>Warnings</h4>
      <ul>
        {warnings.map((warning, index) => (
          <li key={`${warning.code}-${index}`}>{warning.message}</li>
        ))}
      </ul>
    </div>
  );
}
