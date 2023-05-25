import type {CartLineInput} from '@shopify/hydrogen/storefront-api-types';
import {CartForm} from '@shopify/hydrogen';
import type {FetcherWithComponents} from '@remix-run/react';

import {Button} from '~/components';

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
  return (
    <CartForm
      route="/cart"
      inputs={{
        lines,
      }}
      action={CartForm.ACTIONS.LinesAdd}
    >
      {(fetcher: FetcherWithComponents<any>) => (
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
