import {flatRoutes} from '@remix-run/fs-routes';
import {layout} from '@remix-run/route-config';
import {hydrogenRoutes} from '@shopify/hydrogen';

export default hydrogenRoutes([layout('./layout.jsx', await flatRoutes())]);

/** @typedef {import('@remix-run/route-config').RouteConfig} RouteConfig */
