import {
  type PageViewPayload,
  useUnstable__Analytics,
  useLoadScript,
} from '@shopify/hydrogen';
import {useEffect} from 'react';

export function MyAnalytics() {
  const {subscribe, register} = useUnstable__Analytics();

  // Load the 3p analytics script
  const scriptStatus = useLoadScript(
    'https://example.com/some-3p-analytics-script.js',
  );

  // unique string identifier
  const {ready} = register('MyAnalytics');

  useEffect(() => {
    // Make sure the 3p script is loaded
    if (scriptStatus !== 'done') return;

    // Initialize the 3p analytics script

    // Subscribe to analytics events
    subscribe('page_viewed', (data: PageViewPayload) => {
      // report to 3p analytics
    });

    // Register the MyAnalytics component as ready
    ready();
  }, []);

  return null;
}
