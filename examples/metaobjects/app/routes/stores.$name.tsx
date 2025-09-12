import {useLoaderData} from 'react-router';
import type {Route} from './+types/stores.$name';

// 1. Add metaobject content imports
import {ROUTE_CONTENT_QUERY, RouteContent} from '~/sections/RouteContent';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params}: Route.LoaderArgs) {
  const {storefront} = context;
  const {name} = params;
  
  // 2. Query for the route's content metaobject
  const [{route}] = await Promise.all([
    storefront.query(ROUTE_CONTENT_QUERY, {
      variables: {handle: `route-${name}`},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {route};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  // No deferred data for this route
  return {};
}

export default function Store() {
  const {route} = useLoaderData<typeof loader>();
  return (
    <div className="store">
      {/* 3. Render the route's content sections */}
      <RouteContent route={route} />
    </div>
  );
}
