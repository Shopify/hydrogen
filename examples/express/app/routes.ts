import {flatRoutes} from '@remix-run/fs-routes';
import type {RouteConfig} from '@remix-run/route-config';
import {hydrogenRoutes} from '@shopify/hydrogen';

console.log('hydrogenRoutes', hydrogenRoutes);

export default [
  ...(await hydrogenRoutes()),
  ...(await flatRoutes({rootDirectory: 'fs-routes'})),
] satisfies RouteConfig;
