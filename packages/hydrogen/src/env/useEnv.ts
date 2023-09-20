import {useMatches} from '@remix-run/react';
import type {PublicEnv} from './getPublicEnv';

/**
 * Returns the public environment variables from the root route data.
 * @example
 * ```ts
 * function Header() {
 *  const env = useEnv();
 * }
 * ```
 */
export function useEnv(): PublicEnv | null {
  const [root] = useMatches();
  return root?.data?.publicEnv ?? null;
}
