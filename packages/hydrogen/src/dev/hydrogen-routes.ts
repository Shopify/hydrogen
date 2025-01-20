import {route, RouteConfig, RouteConfigEntry} from '@remix-run/route-config';
import {getVirtualRoutes} from '../vite/get-virtual-routes';

export async function hydrogenRoutes(): Promise<RouteConfigEntry[]> {
  console.log('hydrogenRoutes', import.meta.env.DEV);
  // Only include these routes in development.
  if (!import.meta.env.DEV) {
    return [];
  }

  const {root, routes: virtualRoutes} = await getVirtualRoutes();

  return [
    route(
      root.path,
      root.file,
      {id: root.id},
      virtualRoutes.map(({path, file, index, id}) => {
        return route(path, file, {id, index});
      }),
    ),
  ];
}
