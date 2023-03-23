import {
  CartLineInput,
  CartLineUpdateInput,
} from '@shopify/hydrogen/storefront-api-types';
import {
  type FetcherWithComponents,
  useFetcher,
  useFetchers,
} from '@remix-run/react';
import {CartAction} from './types';

type CartActionProps<T> = T extends 'LINES_ADD'
  ? {
      action: T;
      children?: (fetcher: FetcherWithComponents<any>) => React.ReactNode;
      inputs: CartLineInput[];
    }
  : T extends 'LINES_UPDATE'
  ? {
      action: T;
      children?: (fetcher: FetcherWithComponents<any>) => React.ReactNode;
      inputs: CartLineUpdateInput[];
    }
  : T extends 'LINES_REMOVE'
  ? {
      action: T;
      children?: (fetcher: FetcherWithComponents<any>) => React.ReactNode;
      inputs: {
        lineIds: string[];
      };
    }
  : never;

export function CartAction<T extends CartAction>({
  children,
  inputs,
  action,
}: CartActionProps<T>) {
  const fetcher = useFetcher();
  let fields: React.ReactNode[] | null = null;

  switch (action) {
    case 'LINES_UPDATE':
      fields = inputs.map((line) => {
        return (
          <input
            key={line.merchandiseId}
            type="hidden"
            name="lines"
            value={JSON.stringify([line])}
          />
        );
      });
      break;
    case 'LINES_ADD':
      fields = inputs?.map((line) => {
        return (
          <input
            key={line.merchandiseId}
            type="hidden"
            name="lines"
            value={JSON.stringify([line])}
          />
        );
      });
      break;
    case 'LINES_REMOVE':
      fields = inputs.lineIds.map((line) => {
        return <input key={line} type="hidden" name="lineIds" value={line} />;
      });
      break;
  }

  return (
    <fetcher.Form action="/cart" method="post">
      <input type="hidden" name="action" value={action} />
      {fields}
      {typeof children === 'function' && children(fetcher)}
    </fetcher.Form>
  );
}
