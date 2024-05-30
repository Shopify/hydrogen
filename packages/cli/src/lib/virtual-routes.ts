/**
 * This file is only used for the classic compiler.
 * Refer to `hydrogen/src/vite/add-virtual-routes.ts` for Vite.
 * @deprecated
 */

import {fileURLToPath} from 'node:url';
import {glob} from '@shopify/cli-kit/node/fs';
import {joinPath, relativePath} from '@shopify/cli-kit/node/path';
import type {RemixConfig} from './remix-config.js';
import {getAssetsDir} from './build.js';

export const VIRTUAL_ROUTES_DIR = 'virtual-routes/routes';
export const VIRTUAL_ROOT = 'virtual-routes/virtual-root';

type MinimalRemixConfig = {
  appDirectory: string;
  routes: RemixConfig['routes'];
};

export async function addVirtualRoutes<T extends MinimalRemixConfig>(
  config: T,
): Promise<T> {
  const distPath = process.env.SHOPIFY_UNIT_TEST
    ? fileURLToPath(new URL('../../../hydrogen/src/vite', import.meta.url))
    : await getAssetsDir();

  const userRouteList = Object.values(config.routes);
  const virtualRoutesPath = joinPath(distPath, VIRTUAL_ROUTES_DIR);

  for (const absoluteFilePath of await glob(
    joinPath(virtualRoutesPath, '**', '*'),
  )) {
    const relativeFilePath = relativePath(virtualRoutesPath, absoluteFilePath);
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
      const id = VIRTUAL_ROUTES_DIR + '/' + routePath;

      config.routes[id] = {
        id,
        parentId: VIRTUAL_ROOT,
        path: normalizedVirtualRoutePath,
        index: isIndex || undefined,
        caseSensitive: undefined,
        file: relativePath(config.appDirectory, absoluteFilePath),
      };

      if (!config.routes[VIRTUAL_ROOT]) {
        config.routes[VIRTUAL_ROOT] = {
          id: VIRTUAL_ROOT,
          path: '',
          file: relativePath(
            config.appDirectory,
            joinPath(distPath, VIRTUAL_ROOT + '.jsx'),
          ),
        };
      }
    }
  }

  return config;
}
