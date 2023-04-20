import {type FetcherWithComponents, useFetcher} from '@remix-run/react';
import {type CartFormInput, CartFormInputAction} from '@shopify/hydrogen';
import React from 'react';

type CartFormProps = {
  children?: (
    fetcher: FetcherWithComponents<any>,
    submit: (data?: object) => void,
  ) => React.ReactNode;
  formInput: CartFormInput;
  route?: string;
};

const CART_FORM_INPUT_NAME = 'cartFormInput';

export function CartForm({children, formInput, route}: CartFormProps) {
  const fetcher = useFetcher();

  const submit = (data?: object) => {
    fetcher.submit(
      {
        [CART_FORM_INPUT_NAME]: JSON.stringify(
          {
            ...formInput,
            ...data,
          } || {},
        ),
      },
      {
        method: 'post',
        action: route || '?index',
      },
    );
  };

  return (
    <fetcher.Form action={route || ''} method="post">
      <input
        type="hidden"
        name={CART_FORM_INPUT_NAME}
        value={JSON.stringify(formInput || {})}
      />
      {typeof children === 'function' && children(fetcher, submit)}
    </fetcher.Form>
  );
}

export function getFormInput(formData: any): CartFormInput {
  const cartFormInput = formData.has(CART_FORM_INPUT_NAME)
    ? (JSON.parse(String(formData.get(CART_FORM_INPUT_NAME))) as CartFormInput)
    : ({} as CartFormInput);
  return cartFormInput;
}
