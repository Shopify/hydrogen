import type {CartLineInput} from '@shopify/storefront-kit-react/storefront-api-types';
import {useFetcher, useMatches} from '@remix-run/react';
import {Button} from '~/components';
import {CartAction} from '~/lib/type';

export function AddToCartButton({
  children,
  lines,
  className = '',
  variant = 'primary',
  width = 'full',
  ...props
}: {
  children: React.ReactNode;
  lines: CartLineInput[];
  className?: string;
  variant?: 'primary' | 'secondary' | 'inline';
  width?: 'auto' | 'full';
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
      <Button
        as="button"
        type="submit"
        width={width}
        variant={variant}
        className={className}
        {...props}
      >
        {children}
      </Button>
    </fetcher.Form>
  );
}
