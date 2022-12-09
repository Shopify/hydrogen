import {useFetchers} from '@remix-run/react';

export function useEventIdFetchers(eventId: string) {
  const fetchers = useFetchers();
  const cartFetchers = [];

  for (const fetcher of fetchers) {
    const formData = fetcher.submission?.formData;
    if (formData && formData.get('eventId') === eventId) {
      cartFetchers.push(fetcher);
    }
  }
  return cartFetchers;
}
