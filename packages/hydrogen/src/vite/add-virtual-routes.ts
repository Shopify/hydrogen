import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdir} from 'node:fs/promises';

export const VIRTUAL_ROUTES_DIR = 'virtual-routes/routes';
export const VIRTUAL_ROOT = 'virtual-routes/virtual-root';

export function getVirtualRoutes() {
  const distPath = path.dirname(fileURLToPath(import.meta.url));
  const virtualRoutesPath = path.join(distPath, VIRTUAL_ROUTES_DIR);

  return readdir(virtualRoutesPath, {recursive: true}).then((files) =>
    files.map((relativeFilePath) => {
      const absoluteFilePath = path.join(virtualRoutesPath, relativeFilePath);
      const routePath =
        '/' +
        relativeFilePath
          .replace(/\.[jt]sx?$/, '')
          .replace(/(^|\/)index$/, '')
          .replaceAll('\\', '/');

      return [routePath, absoluteFilePath] as const;
    }),
  );
}
