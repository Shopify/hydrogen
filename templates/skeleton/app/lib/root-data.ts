import {useMatches} from '@remix-run/react';
import type {UIMatch} from '@remix-run/react';
import type {loader} from '~/root';

/**
 * Access the result of the root loader from a React component.
 */
export function useRootLoaderData() {
  const [root] = useMatches();
  return (root as UIMatch<typeof loader>)?.data;
}
