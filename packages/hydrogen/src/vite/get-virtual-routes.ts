// v3_routeConfig virtual routes constants
export const VIRTUAL_ROUTES_DIR = 'vite/virtual-routes/routes';
export const VIRTUAL_ROUTES_ROUTES_DIR_PARTS = [
  'vite',
  'virtual-routes',
  'routes',
];
export const VIRTUAL_ROUTES_DIR_PARTS = ['vite', 'virtual-routes'];

function getVirtualRoutesPath(
  pathParts: Array<string>,
  forFile: string,
): string {
  const basePath = new URL('../', import.meta.url);
  const virtualRoutesPath = pathParts.reduce((working, dirPart) => {
    return new URL(`${dirPart}/`, working);
  }, basePath);

  // Getting rid of the drive path (ie. '/C:/') in windows
  return new URL(forFile, virtualRoutesPath).pathname.replace(
    /^\/[a-zA-Z]:\//,
    '/',
  );
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
        id: `${VIRTUAL_ROUTES_DIR}/[.]well-known.appspecific.com[.]chrome[.]devtools[.]json`,
        path: '.well-known/appspecific/com.chrome.devtools.json',
        file: getVirtualRoutesPath(
          VIRTUAL_ROUTES_ROUTES_DIR_PARTS,
          '[.]well-known.appspecific.com[.]chrome[.]devtools[.]json.jsx',
        ),
        index: false,
      },
      {
        id: `${VIRTUAL_ROUTES_DIR}/index`,
        path: '',
        file: getVirtualRoutesPath(
          VIRTUAL_ROUTES_ROUTES_DIR_PARTS,
          'index.jsx',
        ),
        index: true,
      },
    ],
    layout: {
      file: getVirtualRoutesPath(VIRTUAL_ROUTES_DIR_PARTS, 'layout.jsx'),
    },
  };
}
