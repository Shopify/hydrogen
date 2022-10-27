import {useParentRouteData} from './useRouteData';
import {CountriesData} from '~/data/countries';

/*
  This is an experimental pattern that helps prevent props drilling
*/
export function useCountries(): CountriesData | null {
  const rootData = useParentRouteData('/');

  if (typeof rootData?.countries === 'undefined') {
    return null;
  }

  if (rootData?.countries) {
    return rootData?.countries;
  }

  throw rootData?.countries;
}
