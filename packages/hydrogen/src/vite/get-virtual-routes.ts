import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdir} from 'node:fs/promises';

export const VIRTUAL_ROUTES_DIR = 'virtual-routes/routes';
export const VIRTUAL_ROOT = 'virtual-routes/virtual-root';

export async function getVirtualRoutes() {
  const distPath = path.dirname(fileURLToPath(import.meta.url));
  const virtualRoutesPath = path.join(distPath, VIRTUAL_ROUTES_DIR);

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
          id: `${VIRTUAL_ROUTES_DIR}/${id}`,
          path: routePath,
          file: absoluteFilePath,
          index: isIndex,
        };
      }),
  );

  return {
    routes,
    root: {
      id: VIRTUAL_ROOT,
      path: '',
      file: path.join(distPath, VIRTUAL_ROOT + '.jsx'),
    },
  };
}
