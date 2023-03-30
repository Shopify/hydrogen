import path from 'path';
import {fileURLToPath} from 'url';
import recursiveReaddir from 'recursive-readdir';
import type {RemixConfig} from '@remix-run/dev/dist/config.js';

export const VIRTUAL_ROUTES_DIR = 'virtual-routes';
export const V1_DIR = 'v1';
export const V2_META_DIR = 'v2-meta';

export async function addVirtualRoutes(config: RemixConfig) {
  const userRouteList = Object.values(config.routes);
  const distPath = fileURLToPath(new URL('..', import.meta.url));

  // Base on future flags config, pick the correct virtual routes folder
  const virtualDir = `${VIRTUAL_ROUTES_DIR}/${
    config.future.v2_meta ? V2_META_DIR : V1_DIR
  }`;
  const routesDir = `${virtualDir}/routes`;
  const root = `${virtualDir}/virtual-root`;
  const routesPath = path.join(distPath, routesDir);

  for (const absoluteFilePath of await recursiveReaddir(routesPath)) {
    const relativeFilePath = path.relative(routesPath, absoluteFilePath);
    const routePath = relativeFilePath
      .replace(/\.[jt]sx?$/, '')
      .replaceAll('\\', '/');

    // Note: index routes has path `undefined`,
    // while frame routes such as `root.jsx` have path `''`.
    const isIndex = /(^|\/)index$/.test(routePath);
    const normalizedVirtualRoutePath = isIndex
      ? routePath.slice(0, -'index'.length).replace(/\/$/, '') || undefined
      : // TODO: support v2 flat routes?
        routePath.replace(/\$/g, ':').replace(/[\[\]]/g, '');

    const hasUserRoute = userRouteList.some(
      (r) => r.parentId === 'root' && r.path === normalizedVirtualRoutePath,
    );

    if (!hasUserRoute) {
      const id = routesDir + '/' + routePath;

      config.routes[id] = {
        id,
        parentId: root,
        path: normalizedVirtualRoutePath,
        index: isIndex || undefined,
        caseSensitive: undefined,
        file: path.relative(config.appDirectory, absoluteFilePath),
      };

      if (!config.routes[root]) {
        config.routes[root] = {
          id: root,
          path: '',
          file: path.relative(
            config.appDirectory,
            path.join(distPath, root + '.jsx'),
          ),
        };
      }
    }
  }

  return config;
}
