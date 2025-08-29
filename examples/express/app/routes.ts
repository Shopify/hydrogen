import {flatRoutes} from '@react-router/fs-routes';
import {type RouteConfig} from '@react-router/dev/routes';

export default (async () => {
  const {hydrogenRoutes} = await import('@shopify/hydrogen');
  const routes = await flatRoutes();
  return hydrogenRoutes([...routes]);
})() satisfies Promise<RouteConfig>;
