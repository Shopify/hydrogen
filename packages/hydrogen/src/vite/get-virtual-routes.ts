import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdir} from 'node:fs/promises';
import type {VitePluginConfig} from '@remix-run/dev';

// Based on import type {DefineRouteFunction, DefineRouteOptions} from '@remix-run/dev/dist/config/routes';
interface DefineRouteObject {
  path: string;
  file: string;
  options: {
    id: string;
    index?: boolean;
    caseSensitive?: boolean;
  };
}

const DEV_ONLY_ROUTES_PREFIX = '__dev.';
export const VIRTUAL_ROUTES_DIR = 'virtual-routes/routes';
export const VIRTUAL_ROOT = 'virtual-routes/__dev.root';

export async function getVirtualRoutes(appDirectory?: string): Promise<{
  routes: DefineRouteObject[];
  devRoutes: DefineRouteObject[];
  devRoot: DefineRouteObject;
}> {
  const distPath = path.dirname(fileURLToPath(import.meta.url));
  const virtualRoutesPath = path.join(distPath, VIRTUAL_ROUTES_DIR);

  const routes: DefineRouteObject[] = [];
  const devRoutes: DefineRouteObject[] = [];

  await readdir(virtualRoutesPath, {recursive: true}).then((files) =>
    files.map((relativeFilePath) => {
      const absoluteFilePath = path.join(virtualRoutesPath, relativeFilePath);
      const filePath = appDirectory
        ? path.relative(appDirectory, absoluteFilePath) //h2 build
        : absoluteFilePath; //h2 dev or h2 preview

      const id = relativeFilePath
        .replace(/\.[jt]sx?$/, '')
        .replaceAll('\\', '/');
      const isIndex = /(^|\/)index$/.test(id);
      const routePath = id.replace(/(^|\/)index$/, '');

      const routeObject: DefineRouteObject = {
        path: routePath,
        file: filePath,
        options: {id: `${VIRTUAL_ROUTES_DIR}/${id}`, index: isIndex},
      };

      if (relativeFilePath.startsWith(DEV_ONLY_ROUTES_PREFIX)) {
        devRoutes.push({
          ...routeObject,
          path: routePath.replace(new RegExp(`^${DEV_ONLY_ROUTES_PREFIX}`), ''),
        });
      } else {
        routes.push(routeObject);
      }
    }),
  );

  return {
    routes,
    devRoutes,
    devRoot: {
      path: '',
      file: path.join(distPath, VIRTUAL_ROOT + '.jsx'),
      options: {id: VIRTUAL_ROOT},
    },
  };
}
