import {useMatches} from '@remix-run/react';
import {useDeferred} from './useDeferred';
import {Locale} from '~/lib/type';

/*
  This is an experimental pattern that helps prevent props drilling
*/
export function useSelectedLocale(): Locale & {
  pathPrefix: string;
} {
  const [root] = useMatches();
  return root.data.selectedLocale;
}
