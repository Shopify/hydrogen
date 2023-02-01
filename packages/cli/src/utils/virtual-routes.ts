import path from 'path';
import recursiveReaddir from 'recursive-readdir';
import type {RemixConfig} from '@remix-run/dev/dist/config.js';

export const VIRTUAL_ROUTES_DIR = 'virtual-routes/routes';
export const VIRTUAL_ROOT = 'virtual-routes/virtual-root';
const INDEX_SUFFIX = '/index';

export async function addVirtualRoutes(config: RemixConfig) {
  const userRouteList = Object.values(config.routes);
  const distPath = new URL('..', import.meta.url).pathname;
  const virtualRoutesPath = path.join(distPath, VIRTUAL_ROUTES_DIR);

  for (const absoluteFilePath of await recursiveReaddir(virtualRoutesPath)) {
    const relativeFilePath = path.relative(virtualRoutesPath, absoluteFilePath);
    const routePath = new URL(`file:///${relativeFilePath}`).pathname.replace(
      /\.[jt]sx?$/,
      '',
    );

    // Note: index routes has path `undefined`,
    // while frame routes such as `root.jsx` have path `''`.
    const isIndex = routePath.endsWith(INDEX_SUFFIX);
    const normalizedVirtualRoutePath = isIndex
      ? routePath.slice(0, -INDEX_SUFFIX.length) || undefined
      : // TODO: support v2 flat routes?
        routePath
          .slice(1)
          .replace(/\$/g, ':')
          .replace(/[\[\]]/g, '');

    const hasUserRoute = userRouteList.some(
      (r) => r.parentId === 'root' && r.path === normalizedVirtualRoutePath,
    );

    if (!hasUserRoute) {
      const id = VIRTUAL_ROUTES_DIR + routePath;

      config.routes[id] = {
        id,
        parentId: VIRTUAL_ROOT,
        path: normalizedVirtualRoutePath,
        index: isIndex || undefined,
        caseSensitive: undefined,
        file: path.relative(config.appDirectory, absoluteFilePath),
      };

      if (!config.routes[VIRTUAL_ROOT]) {
        config.routes[VIRTUAL_ROOT] = {
          id: VIRTUAL_ROOT,
          path: '',
          file: path.relative(
            config.appDirectory,
            path.join(distPath, VIRTUAL_ROOT + '.jsx'),
          ),
        };
      }
    }
  }

  return config;
}
