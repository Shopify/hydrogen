import {useFetchers, useLocation, useMatches} from '@remix-run/react';
import {useEffect} from 'react';

export function Analytics() {
  const location = useLocation();
  const events = useExtractAnalyticsFromMatches();

  // Navigation events
  useEffect(() => {
    console.log('Analytics events', events);

    // Function supply by Hydrogen
    // * Implement analytic fallbacks (use sendBeacon / fetch / XHR)
    // * Implement leaky bucket on events
    fetch('/server-event', {
      method: 'post',
      body: JSON.stringify({
        events,
        location: window.location.href,
        referrer: document.referrer,
        pageTitle: document.title,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Formatted analytics', data);
      })
      .catch((err) => {
        // Do nothing in production
        console.error(err);
      });
  }, [location]);

  return null;
}

// Function supply by Hydrogen
function useExtractAnalyticsFromMatches() {
  const matches = useMatches();
  const events: any[] = [];

  matches.forEach((event) => {
    if (event?.data?.analytics) {
      events.push(event.data.analytics);
    }
  });

  return events;
}
