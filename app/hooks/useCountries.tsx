import type {Country} from '@shopify/hydrogen-ui-alpha/storefront-api-types';

import {useParentRouteData} from './useRouteData';

/*
  This is an experimental pattern that helps prevent props drilling
*/
export function useCountries(): Country[] | null {
  const rootData = useParentRouteData('/');

  if (typeof rootData?.cart === 'undefined') {
    return null;
  }

  if (rootData?.countries?._data) {
    return rootData?.countries?._data;
  }

  throw rootData?.countries;
}
