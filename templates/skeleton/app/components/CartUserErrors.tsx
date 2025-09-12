import type {
  CartUserError,
  MetafieldsSetUserError,
  MetafieldDeleteUserError,
} from '@shopify/hydrogen-react/storefront-api-types';

type CartUserErrorsProps = {
  userErrors?:
    | CartUserError[]
    | MetafieldsSetUserError[]
    | MetafieldDeleteUserError[];
};

export function CartUserErrors({userErrors}: CartUserErrorsProps) {
  if (!userErrors || userErrors.length === 0) {
    return null;
  }

  return (
    <div className="cart-user-errors" role="alert">
      <h4>Errors</h4>
      <ul>
        {userErrors.map((userError, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={`${userError.code}-${userError.field}-${index}`}>
            {userError.message}
            {userError.field && (
              <span className="error-field">
                {' '}
                (Field: {userError.field.join('.')})
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
