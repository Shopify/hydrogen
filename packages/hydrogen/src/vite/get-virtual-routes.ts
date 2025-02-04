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

function getChildRoutes() {
  return [
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
  ];
}

export async function getVirtualRoutes() {
  return {
    routes: getChildRoutes(),
    root: {
      id: VIRTUAL_ROOT,
      path: '',
      file: getVirtualRoutesPath(VIRTUAL_ROUTES_DIR_PARTS, 'virtual-root.jsx'),
    },
  };
}

export async function getVirtualRoutesV3() {
  return {
    routes: getChildRoutes(),
    layout: {
      file: getVirtualRoutesPath(VIRTUAL_ROUTES_DIR_PARTS, 'layout.jsx'),
    },
  };
}
