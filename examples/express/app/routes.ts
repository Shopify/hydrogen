import {flatRoutes} from '@react-router/fs-routes';
import type {RouteConfig} from '@react-router/dev/routes';
import {hydrogenRoutes} from '@shopify/hydrogen';

export default hydrogenRoutes([...(await flatRoutes())]) satisfies RouteConfig;
