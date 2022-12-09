import type {CartLineInput} from '@shopify/hydrogen-react/storefront-api-types';
import {useFetcher, useMatches} from '@remix-run/react';
import {Button, Text} from '~/components';
import {CartAction} from '~/lib/type';
import {useId} from 'react';
import {useEventIdFetchers} from '~/hooks/useEventIdFetchers';

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

  const eventId = useId();
  const eventIdFetchers = useEventIdFetchers(eventId);
  const isAdding = !!eventIdFetchers.length;

  return (
    <fetcher.Form action="/cart" method="post">
      <input type="hidden" name="cartAction" value={CartAction.ADD_TO_CART} />
      <input type="hidden" name="countryCode" value={selectedLocale.country} />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <Button
        as="button"
        type="submit"
        width={width}
        variant={variant}
        className={className}
        {...props}
      >
        {isAdding ? (
          <Text as="span" className="flex items-center justify-center gap-2">
            Adding ...
          </Text>
        ) : (
          children
        )}
      </Button>
    </fetcher.Form>
  );
}
