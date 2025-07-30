import {flatRoutes} from '@react-router/fs-routes';
import {hydrogenRoutes} from '@shopify/hydrogen';

export default hydrogenRoutes([
  ...(await flatRoutes()),
  // Manual route definitions can be added to this array, in addition to or instead of using the `flatRoutes` file-based routing convention.
  // See https://remix.run/docs/en/main/guides/routing for more details
]);

/** @typedef {import('@react-router/dev/routes').RouteConfig} RouteConfig */
