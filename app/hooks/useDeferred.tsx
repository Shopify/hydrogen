import {RouteMatch} from '@remix-run/react';

/*
  A utility hook to access defer props from a given route
*/
export function useDeferred(resource: string, route: RouteMatch) {
  if (!route) {
    throw new Error('route not provided');
  }
  if (!resource) {
    throw new Error('resource not provided');
  }
  const isPromise = Boolean(route?.data?.[resource]?.then);

  if (isPromise) {
    // the [resource] promise resolved, returned promised data
    if (route?.data?.[resource]?._data) {
      return route?.data?.[resource]?._data;
    }

    // Promise not yet resolved, throw while data is ready
    // Must be caught by a wrapping suspense boundary
    throw route?.data?.[resource];
  }

  // the [resource] was awaited in the loader return it
  return route.data[resource];
}
