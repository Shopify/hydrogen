import {useMatches} from '@remix-run/react';
import type {ShopifyPageViewPayload} from '@shopify/hydrogen';

import {DEFAULT_LOCALE} from '~/lib/utils';

export function usePageAnalytics({hasUserConsent}: {hasUserConsent: boolean}) {
  const analyticsFromMatches = useDataFromMatches(
    'analytics',
  ) as unknown as ShopifyPageViewPayload;

  const pageAnalytics = {
    ...analyticsFromMatches,
    hasUserConsent,
  };

  return pageAnalytics;
}

function useDataFromMatches(dataKey: string): Record<string, unknown> {
  const matches = useMatches();
  const data: Record<string, unknown> = {};

  matches.forEach((event) => {
    const eventData = event?.data;
    if (eventData) {
      eventData[dataKey] && Object.assign(data, eventData[dataKey]);

      const selectedLocale = eventData['selectedLocale'] || DEFAULT_LOCALE;
      Object.assign(data, {
        currency: selectedLocale.currency,
        acceptedLanguage: selectedLocale.language,
      });
    }
  });

  return data;
}
