import {useMatches} from '@remix-run/react';

export function useParentRouteData(pathname: string): any {
  let matches = useMatches();
  let parentMatch = matches.find((match) => match.pathname === pathname);
  if (!parentMatch) return null;
  return parentMatch.data;
}
