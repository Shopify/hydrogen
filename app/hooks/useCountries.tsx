import {useParentRouteData} from './useRouteData';

import type {Country} from '@shopify/hydrogen-ui-alpha/storefront-api-types';

/*
  This is an experimental pattern that helps prevent props drilling
*/
export function useCountries(): Array<Country> | null {
  const rootData = useParentRouteData('/');

  if (typeof rootData?.cart === 'undefined') {
    return null;
  }

  if (rootData?.countries?._data) {
    return rootData?.countries?._data;
  }

  throw rootData?.countries;
}
