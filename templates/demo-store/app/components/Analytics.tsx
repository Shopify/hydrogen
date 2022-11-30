import {useLocation, useMatches} from '@remix-run/react';
import {useEffect} from 'react';
import {
  getAnalyticsData,
  useExtractAnalyticsFromMatches,
} from '~/lib/analytics';
import {usePrefixPathWithLocale} from '~/lib/utils';

const API_ENDPOINT = '/api/server-event';

export function Analytics() {
  const prefixApiEndpoint = usePrefixPathWithLocale(API_ENDPOINT);
  const location = useLocation();
  const payload = useExtractAnalyticsFromMatches();

  // Navigation events
  useEffect(() => {
    getAnalyticsData({
      apiEndpoint: prefixApiEndpoint,
      eventType: 'pageview',
      payload,
      onSuccess: (data) => {
        console.log('Formatted analytics', data);
      },
      onError: (err) => {
        console.error(err);
      },
    });
  }, [location]);

  return null;
}
