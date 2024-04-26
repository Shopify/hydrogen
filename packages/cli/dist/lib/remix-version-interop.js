import { createRequire } from 'module';

function convertRouteToV1(route) {
  return route.replace(/(^|\.)_index$/, "$1index").replace(/\.(?!\w+\])/g, "/");
}
function isV1RouteConventionInstalled() {
  try {
    const require2 = createRequire(import.meta.url);
    require2.resolve("@remix-run/v1-route-convention/package.json");
    return true;
  } catch {
    return false;
  }
}

export { convertRouteToV1, isV1RouteConventionInstalled };
