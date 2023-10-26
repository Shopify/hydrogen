import {createRequire} from 'module';

export function convertRouteToV1(route: string) {
  return route.replace(/(^|\.)_index$/, '$1index').replace(/\.(?!\w+\])/g, '/');
}

export function isV1RouteConventionInstalled() {
  try {
    const require = createRequire(import.meta.url);
    require.resolve('@remix-run/v1-route-convention/package.json');
    return true;
  } catch {
    return false;
  }
}
