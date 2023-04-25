import type {CartLineInput} from '@shopify/hydrogen/storefront-api-types';
import {Button} from '~/components';
import {CartFormInputAction, CartLinesAdd} from '@shopify/hydrogen';
import {CartForm, CartFormInput} from '@shopify/hydrogen';

export function AddToCartButton({
  children,
  lines,
  className = '',
  variant = 'primary',
  width = 'full',
  disabled,
  analytics,
  ...props
}: {
  children: React.ReactNode;
  lines: CartLineInput[];
  className?: string;
  variant?: 'primary' | 'secondary' | 'inline';
  width?: 'auto' | 'full';
  disabled?: boolean;
  analytics?: unknown;
  [key: string]: any;
}) {
  const formInput: CartFormInput = {
    action: CartFormInputAction.CartLinesAdd,
    lines,
  };

  return (
    <CartForm route="/cart" formInput={formInput}>
      {(fetcher) => (
        <>
          <input
            type="hidden"
            name="analytics"
            value={JSON.stringify(analytics)}
          />
          <Button
            as="button"
            type="submit"
            width={width}
            variant={variant}
            className={className}
            disabled={disabled ?? fetcher.state !== 'idle'}
            {...props}
          >
            {children}
          </Button>
        </>
      )}
    </CartForm>
  );
}
