import {useMatches} from '@remix-run/react';
import {useDeferred} from './useDeferred';
import type {Country} from '@shopify/hydrogen-ui-alpha/storefront-api-types';

/*
  This is an experimental pattern that helps prevent props drilling
*/
export function useCountries(): Array<Country> | null {
  const [root] = useMatches();
  return useDeferred('countries', root);
}
