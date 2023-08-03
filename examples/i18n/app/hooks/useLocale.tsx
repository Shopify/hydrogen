import {useMatches} from '@remix-run/react';

export function useLocale() {
  const [root] = useMatches();
  return root.data.i18n;
}
