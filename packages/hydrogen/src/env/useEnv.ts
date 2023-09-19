import {useMatches} from '@remix-run/react';
import type {PublicEnv} from './getPublicEnv.server';

export function useEnv(): PublicEnv | null {
  const [root] = useMatches();
  return root?.data?.env ?? null;
}
