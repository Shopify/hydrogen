/**
 * @param {CartUserErrorsProps}
 */
export function CartUserErrors({userErrors}) {
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

/**
 * @typedef {{
 *   userErrors?:
 *     | CartUserError[]
 *     | MetafieldsSetUserError[]
 *     | MetafieldDeleteUserError[];
 * }} CartUserErrorsProps
 */

/** @typedef {import('@shopify/hydrogen-react/storefront-api-types').CartUserError} CartUserError */
/** @typedef {import('@shopify/hydrogen-react/storefront-api-types').MetafieldsSetUserError} MetafieldsSetUserError */
/** @typedef {import('@shopify/hydrogen-react/storefront-api-types').MetafieldDeleteUserError} MetafieldDeleteUserError */
