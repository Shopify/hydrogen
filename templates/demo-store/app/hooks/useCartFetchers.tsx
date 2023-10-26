import {useFetchers} from '@remix-run/react';
import {CartForm} from '@shopify/hydrogen';

export function useCartFetchers(actionName: string) {
  const fetchers = useFetchers();
  const cartFetchers = [];

  for (const fetcher of fetchers) {
    if (fetcher.formData) {
      const formInputs = CartForm.getFormInput(fetcher.formData);
      if (formInputs.action === actionName) {
        cartFetchers.push(fetcher);
      }
    }
  }
  return cartFetchers;
}
