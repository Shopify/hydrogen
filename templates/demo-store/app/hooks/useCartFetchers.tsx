import {useFetchers} from '@remix-run/react';

export function useCartFetchers(actionName: string) {
  const fetchers = useFetchers();
  const cartFetchers = [];

  for (const fetcher of fetchers) {
    if (fetcher.type === 'actionReload' && fetcher.state === 'loading') {
      const {formData} = fetcher.submission;
      if (formData.get('cartAction') === actionName) {
        cartFetchers.push(fetcher);
      }
    }
  }
  return cartFetchers;
}
