/**
 * @param {CartWarningsProps}
 */
export function CartWarnings({warnings}) {
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

/**
 * @typedef {{
 *   warnings?: CartWarning[];
 * }} CartWarningsProps
 */

/** @typedef {import('@shopify/hydrogen-react/storefront-api-types').CartWarning} CartWarning */
