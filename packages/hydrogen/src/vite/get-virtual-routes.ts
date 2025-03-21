import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdir} from 'node:fs/promises';

// v3_routeConfig virtual routes constants
export const VIRTUAL_ROUTES_DIR = 'vite/virtual-routes/routes';
export const VIRTUAL_ROUTES_ROUTES_DIR_PARTS = [
  'vite',
  'virtual-routes',
  'routes',
];
export const VIRTUAL_ROUTES_DIR_PARTS = ['vite', 'virtual-routes'];
export const VIRTUAL_ROOT = 'vite/virtual-routes/virtual-root';

function getVirtualRoutesPath(
  pathParts: Array<string>,
  forFile: string,
): string {
  const basePath = new URL('../', import.meta.url);
  const virtualRoutesPath = pathParts.reduce((working, dirPart) => {
    return new URL(`${dirPart}/`, working);
  }, basePath);
  return new URL(forFile, virtualRoutesPath).pathname;
}

export async function getVirtualRoutesV3() {
  return {
    routes: [
      {
        id: `${VIRTUAL_ROUTES_DIR}/graphiql`,
        path: 'graphiql',
        file: getVirtualRoutesPath(
          VIRTUAL_ROUTES_ROUTES_DIR_PARTS,
          'graphiql.jsx',
        ),
        index: false,
      },
      {
        id: `${VIRTUAL_ROUTES_DIR}/subrequest-profiler`,
        path: 'subrequest-profiler',
        file: getVirtualRoutesPath(
          VIRTUAL_ROUTES_ROUTES_DIR_PARTS,
          'subrequest-profiler.jsx',
        ),
        index: false,
      },
      {
        id: `${VIRTUAL_ROUTES_DIR}/index`,
        path: '',
        file: getVirtualRoutesPath(VIRTUAL_ROUTES_ROUTES_DIR_PARTS, 'index.jsx'),
        index: true,
      },
    ],
    layout: {
      file: getVirtualRoutesPath(VIRTUAL_ROUTES_DIR_PARTS, 'layout.jsx'),
    },
  };
}

// original virtual routes constants
export const VIRTUAL_ROUTES_DIR_ORIG = 'virtual-routes/routes';
export const VIRTUAL_ROOT_ORIG = 'virtual-routes/virtual-root-with-layout';

export async function getVirtualRoutes() {
  const distPath = path.dirname(fileURLToPath(import.meta.url));
  const virtualRoutesPath = path.join(distPath, VIRTUAL_ROUTES_DIR_ORIG);

  const routes = await readdir(virtualRoutesPath, {recursive: true}).then(
    (files) =>
      files.map((relativeFilePath) => {
        const absoluteFilePath = path.join(virtualRoutesPath, relativeFilePath);
        const id = relativeFilePath
          .replace(/\.[jt]sx?$/, '')
          .replaceAll('\\', '/');
        const isIndex = /(^|\/)index$/.test(id);
        const routePath = id.replace(/(^|\/)index$/, '');

        return {
          id: `${VIRTUAL_ROUTES_DIR_ORIG}/${id}`,
          path: routePath,
          file: absoluteFilePath,
          index: isIndex,
        };
      }),
  );

  return {
    routes,
    root: {
      id: VIRTUAL_ROOT_ORIG,
      path: '',
      file: path.join(distPath, VIRTUAL_ROOT_ORIG + '.jsx'),
    },
  };
}
