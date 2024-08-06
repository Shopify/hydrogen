import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdir} from 'node:fs/promises';
import type {DefineRouteFunction} from '@remix-run/dev/dist/config/routes';

type DefineRouteParams = Parameters<DefineRouteFunction>;

export const MAGIC_ROUTES_DIR = 'magic-routes';

export async function getMagicRoutes(
  appDirectory?: string,
): Promise<DefineRouteParams[]> {
  const distPath = path.dirname(fileURLToPath(import.meta.url));
  const magicRoutesPath = path.join(distPath, MAGIC_ROUTES_DIR);

  return await readdir(magicRoutesPath, {recursive: true}).then((files) =>
    files.map((relativeFilePath) => {
      const absoluteFilePath = path.join(magicRoutesPath, relativeFilePath);
      const filePath = appDirectory
        ? path.relative(appDirectory, absoluteFilePath) //h2 build
        : absoluteFilePath; //h2 dev or h2 preview

      const id = relativeFilePath
        .replace(/\.[jt]sx?$/, '')
        .replaceAll('\\', '/');
      const isIndex = /(^|\/)index$/.test(id);
      const routePath = id.replace(/(^|\/)index$/, '');

      return [
        routePath,
        filePath,
        {id: `${MAGIC_ROUTES_DIR}/${id}`, index: isIndex},
      ];
    }),
  );
}
