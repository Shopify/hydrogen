import {useParentRouteData} from './useRouteData';

import type {
  Country,
} from "@shopify/hydrogen-ui-alpha/storefront-api-types";

export function useCountries(): Array<Country> | undefined {
  const rootData = useParentRouteData('/');

  return rootData?.countries?._data
}

