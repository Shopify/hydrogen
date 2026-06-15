import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {AbortError} from '@shopify/cli-kit/node/error';
import {findUpAndReadPackageJson} from '@shopify/cli-kit/node/node-package-manager';
import {dirname, joinPath} from '@shopify/cli-kit/node/path';

const require = createRequire(import.meta.url);

export type Vite = typeof import('vite');

export async function importVite(root: string): Promise<Vite> {
  let vitePath: string;

  try {
    vitePath = require.resolve(
      'vite',
      process.env.SHOPIFY_UNIT_TEST ? undefined : {paths: [root]},
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error as Error & {code?: string}).code === 'MODULE_NOT_FOUND'
    ) {
      throw new AbortError(
        "Could not find the 'vite' package in your project.",
        'Hydrogen uses Vite to run this command.',
        [
          'Run this command from the root directory of your Hydrogen app.',
          'Install your project dependencies (for example, by running `npm install`) and try again.',
        ],
      );
    }

    throw error;
  }

  const vitePackageJson = await findUpAndReadPackageJson(vitePath);

  // vite 7
  let viteNodeIndexFile = (vitePackageJson.content as any).exports?.['.'];

  // vite 6
  if (typeof viteNodeIndexFile !== 'string') {
    viteNodeIndexFile = viteNodeIndexFile?.import;
  }

  // vite 5
  if (typeof viteNodeIndexFile !== 'string') {
    viteNodeIndexFile = viteNodeIndexFile.default;
  }

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
