import { findUpAndReadPackageJson } from '@shopify/cli-kit/node/node-package-manager';
import { dirname, joinPath } from '@shopify/cli-kit/node/path';

export type Vite = typeof import('vite');

export async function importVite(root: string) {
  const vitePath = require.resolve('vite', {paths: [root]});
  const vitePackageJson = await findUpAndReadPackageJson(vitePath) as {content: {[key: string]: any}, path: string};
  const viteNodeIndexFile = vitePackageJson.content.exports?.['.'].import.default
  const viteNodePath = joinPath(dirname(vitePackageJson.path), viteNodeIndexFile)
  type Vite = typeof import('vite');
  return import(viteNodePath) as Promise<Vite>
}
