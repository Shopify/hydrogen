import {type FetcherWithComponents, useFetcher} from '@remix-run/react';
import {type CartFormInput} from '@shopify/hydrogen';
import React from 'react';

type CartFormProps = {
  children?: (fetcher: FetcherWithComponents<any>) => React.ReactNode;
  formInput: CartFormInput;
  route: string;
};

export function CartForm({children, formInput, route}: CartFormProps) {
  const fetcher = useFetcher();

  return (
    <fetcher.Form action={route} method="post">
      <input
        type="hidden"
        name="cartFormInput"
        value={JSON.stringify(formInput || {})}
      />
      {typeof children === 'function' && children(fetcher)}
    </fetcher.Form>
  );
}
