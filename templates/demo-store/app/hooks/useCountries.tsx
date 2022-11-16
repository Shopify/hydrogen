import {useMatches} from '@remix-run/react';
import {useDeferred} from './useDeferred';
import type {Country} from '@shopify/hydrogen-react/storefront-api-types';
import {Localizations} from '~/lib/type';

/*
  This is an experimental pattern that helps prevent props drilling
*/
export function useCountries(): Localizations | null {
  const [root] = useMatches();
  return useDeferred('countries', root);
}
