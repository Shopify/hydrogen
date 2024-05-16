import {findUpAndReadPackageJson} from '@shopify/cli-kit/node/node-package-manager';
import {dirname, joinPath} from '@shopify/cli-kit/node/path';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);

export type Vite = typeof import('vite');

export async function importVite(root: string) {
  const vitePath = require.resolve('vite', {paths: [root]});
  const vitePackageJson = (await findUpAndReadPackageJson(vitePath)) as {
    content: {[key: string]: any};
    path: string;
  };
  const viteNodeIndexFile =
    vitePackageJson.content.exports?.['.'].import.default;
  const viteNodePath = joinPath(
    dirname(vitePackageJson.path),
    viteNodeIndexFile,
  );
  type Vite = typeof import('vite');
  return import(viteNodePath) as Promise<Vite>;
}

export async function importLocal<T>(
  packageName: string,
  path: string,
): Promise<T> {
  const realPath = require.resolve(packageName, {paths: [path]});
  return import(realPath);
}
