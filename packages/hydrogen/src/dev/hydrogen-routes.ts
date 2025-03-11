import {getVirtualRoutesV3} from '../vite/get-virtual-routes';
import {type RouteConfigEntry} from '@remix-run/route-config';

// Make this transform the existing routes instead.
export async function hydrogenRoutes(
  currentRoutes: Array<RouteConfigEntry>,
): Promise<Array<RouteConfigEntry>> {
  // Only run this in development.
  if (!import.meta.env.DEV) {
    return currentRoutes;
  }

  const {layout, routes: virtualRoutes} = await getVirtualRoutesV3();

  const childVirtualRoutes = virtualRoutes.map(({path, file, index, id}) => {
    return {
      file,
      id,
      index,
      path,
    };
  });

  const virtualLayout = {
    file: layout.file,
    children: childVirtualRoutes,
  };

  // The virtual root should land after any existing routes because of the root path
  // handling.
  return [...currentRoutes, virtualLayout];
}
