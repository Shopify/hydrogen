import type {CartMainProps} from '~/components/CartMain';

type CartNotificationProps = Pick<CartMainProps, 'warnings' | 'userErrors'>;

export function CartNotifications({
  warnings,
  userErrors,
}: CartNotificationProps) {
  return (
    <div aria-labelledby="cart-notifications" className={'cart-notifications'}>
      {warnings ? <CartWarnings warnings={warnings} /> : null}
      {userErrors ? <CartUserErrors userErrors={userErrors} /> : null}
    </div>
  );
}

type CartUserErrorsProps = Pick<CartNotificationProps, 'userErrors'>;

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

type CartWarningsProps = Pick<CartNotificationProps, 'warnings'>;

export function CartWarnings({warnings}: CartWarningsProps) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <div className="cart-warnings" role="alert">
      <h4>Warnings</h4>
      <ul>
        {warnings.map((warning, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={`${warning.code}-${index}`}>{warning.message}</li>
        ))}
      </ul>
    </div>
  );
}
