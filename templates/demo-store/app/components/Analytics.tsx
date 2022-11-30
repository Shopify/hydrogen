import {useActionData, useLocation, useMatches} from '@remix-run/react';
import {useEffect} from 'react';
import {
  getAnalyticsData,
  useExtractAnalyticsFromMatches,
} from '~/lib/analytics';
import {usePrefixPathWithLocale} from '~/lib/utils';

const API_ENDPOINT = '/api/server-event';

export function Analytics() {
  const location = useLocation();
  const payload = useExtractAnalyticsFromMatches();

  // Navigation events
  useEffect(() => {
    getAnalyticsData({
      apiEndpoint: '/api/server-event',
      eventType: 'pageview',
      payload,
      onSuccess: (data) => {
        console.log('Formatted page view analytics', data);
      },
      onError: (err) => {
        console.error(err);
      },
    });
  }, [location]);

  return null;
}
