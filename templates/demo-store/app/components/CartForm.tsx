import {type FetcherWithComponents, useFetcher} from '@remix-run/react';
import {type CartFormInput, CartFormInputAction} from '@shopify/hydrogen';
import React from 'react';

type CartFormProps = {
  children?: (fetcher: FetcherWithComponents<any>) => React.ReactNode;
  formInput: CartFormInput;
  route?: string;
};

const CART_FORM_INPUT_NAME = 'cartFormInput';

export function CartForm({children, formInput, route}: CartFormProps) {
  const fetcher = useFetcher();

  return (
    <fetcher.Form action={route || ''} method="post">
      <input
        type="hidden"
        name={CART_FORM_INPUT_NAME}
        value={JSON.stringify(formInput || {})}
      />
      {typeof children === 'function' && children(fetcher)}
    </fetcher.Form>
  );
}

export function getFormInput(formData: any): {
  action: typeof CartFormInputAction;
  cartInput: Omit<CartFormInput, 'action'>;
} {
  const cartFormInput = formData.has(CART_FORM_INPUT_NAME)
    ? (JSON.parse(String(formData.get(CART_FORM_INPUT_NAME))) as CartFormInput)
    : ({} as CartFormInput);
  const {action, ...cartInput} = cartFormInput;
  return {action, cartInput};
}
