import {type RouteConfigEntry} from '@react-router/dev/dist/routes';

// Make this transform the existing routes instead.
export async function hydrogenRoutes(
  currentRoutes: Array<RouteConfigEntry>,
): Promise<Array<RouteConfigEntry>> {
  // Only run this in development.
  if (process.env.NODE_ENV !== 'development') {
    return currentRoutes;
  }

  // Dynamic import to avoid loading Node.js modules in worker environment
  const {getVirtualRoutesV3} = await import('../vite/get-virtual-routes');
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
