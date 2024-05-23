import {createRequire} from 'node:module';
import {findUpAndReadPackageJson} from '@shopify/cli-kit/node/node-package-manager';
import {dirname, joinPath} from '@shopify/cli-kit/node/path';

const require = createRequire(import.meta.url);

export type Vite = typeof import('vite');

export async function importVite(root: string): Promise<Vite> {
  const vitePath = require.resolve('vite', {paths: [root]});
  const vitePackageJson = await findUpAndReadPackageJson(vitePath);

  const viteNodeIndexFile = (vitePackageJson.content as any).exports?.['.']
    .import.default;
  const viteNodePath = joinPath(
    dirname(vitePackageJson.path),
    viteNodeIndexFile,
  );

  return import(viteNodePath);
}

export function importLocal<T>(packageName: string, path: string): Promise<T> {
  const realPath = require.resolve(packageName, {paths: [path]});
  return import(realPath);
}
