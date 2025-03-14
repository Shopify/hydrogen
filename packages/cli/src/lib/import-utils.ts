import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {findUpAndReadPackageJson} from '@shopify/cli-kit/node/node-package-manager';
import {dirname, joinPath} from '@shopify/cli-kit/node/path';

const require = createRequire(import.meta.url);

export type Vite = typeof import('vite');

export async function importVite(root: string): Promise<Vite> {
  const vitePath = require.resolve(
    'vite',
    process.env.SHOPIFY_UNIT_TEST ? undefined : {paths: [root]},
  );

  const vitePackageJson = await findUpAndReadPackageJson(vitePath);

  let viteNodeIndexFile = (vitePackageJson.content as any).exports?.['.']
    .import;

  // If project still using vite 5
  if ('default' in viteNodeIndexFile) {
    viteNodeIndexFile = viteNodeIndexFile.default;
  }

  console.log(viteNodeIndexFile);
  const viteNodePath = joinPath(
    dirname(vitePackageJson.path),
    viteNodeIndexFile,
  );

  return import(pathToFileURL(viteNodePath).href);
}

export function importLocal<T>(packageName: string, path: string): Promise<T> {
  const realPath = require.resolve(
    packageName,
    process.env.SHOPIFY_UNIT_TEST ? undefined : {paths: [path]},
  );

  return import(pathToFileURL(realPath).href);
}
