import {
  CartLineInput,
  CartLineUpdateInput,
} from '@shopify/hydrogen/storefront-api-types';
import {type FetcherWithComponents, useFetcher} from '@remix-run/react';
import {type CartAction as CartActionType} from './types';

type CartActionProps<T> = T extends 'LINES_ADD'
  ? {
      action: T;
      children?: (fetcher: FetcherWithComponents<any>) => React.ReactNode;
      cartInput: {
        lines: CartLineInput[];
      };
    }
  : T extends 'LINES_UPDATE'
  ? {
      action: T;
      children?: (fetcher: FetcherWithComponents<any>) => React.ReactNode;
      cartInput: {
        lines: CartLineUpdateInput[];
      };
    }
  : T extends 'LINES_REMOVE'
  ? {
      action: T;
      children?: (fetcher: FetcherWithComponents<any>) => React.ReactNode;
      cartInput: {
        lineIds: string[];
      };
    }
  : never;

export function CartAction<T extends CartActionType>({
  children,
  cartInput,
  action,
}: CartActionProps<T>) {
  const fetcher = useFetcher();

  return (
    <fetcher.Form action="/cart" method="post">
      <input type="hidden" name="action" value={action} />
      <input
        type="hidden"
        name="cartInput"
        value={JSON.stringify(cartInput || {})}
      />
      {typeof children === 'function' && children(fetcher)}
    </fetcher.Form>
  );
}
