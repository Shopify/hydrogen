import type {CartLineInput} from '@shopify/hydrogen/storefront-api-types';
import {useFetcher, useMatches} from '@remix-run/react';
import {Button} from '~/components';
import {CartAction} from '~/lib/type';

export function AddToCartButton({
  children,
  lines,
  className = '',
  variant = 'primary',
  width = 'full',
  isOutOfStock,
  analytics,
  ...props
}: {
  children: React.ReactNode;
  lines: CartLineInput[];
  className?: string;
  variant?: 'primary' | 'secondary' | 'inline';
  width?: 'auto' | 'full';
  isOutOfStock?: boolean;
  analytics?: unknown;
  [key: string]: any;
}) {
  const [root] = useMatches();
  const selectedLocale = root?.data?.selectedLocale;
  const fetcher = useFetcher();

  return (
    <fetcher.Form action="/cart" method="post">
      <input type="hidden" name="cartAction" value={CartAction.ADD_TO_CART} />
      <input type="hidden" name="countryCode" value={selectedLocale.country} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <input type="hidden" name="analytics" value={JSON.stringify(analytics)} />
      <Button
        as="button"
        type={isOutOfStock ? 'button' : 'submit'}
        width={width}
        variant={variant}
        className={className}
        disabled={isOutOfStock}
        {...props}
      >
        {children}
      </Button>
    </fetcher.Form>
  );
}
