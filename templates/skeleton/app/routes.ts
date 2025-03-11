import {layout, type RouteConfig} from '@remix-run/route-config';
import {
  UNSAFE_flatRoutes,
  UNSAFE_routeManifestToRouteConfig,
} from '@remix-run/dev';
import {hydrogenRoutes} from '@shopify/hydrogen';

export default hydrogenRoutes([
  layout(
    './layout.tsx',
    {},
    UNSAFE_routeManifestToRouteConfig(
      await UNSAFE_flatRoutes(
        '/Users/sean/src/github.com/Shopify/hydrogen/templates/skeleton/app',
      ),
    ),
  ),
]) satisfies RouteConfig;
