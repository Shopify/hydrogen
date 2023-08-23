import type {Dependencies} from './types.js';
import {readFile} from '@shopify/cli-kit/node/fs';

/**
 * Returns the dependencies for a given package.json
 * @param packageJsonPath - Path to the package.json
 * @returns The dependencies, devDependencies and peerDependencies
 * @throws If the package.json cannot be read
 * @example
 * ```ts
 * const {
 *  dependencies,
 *  devDependencies,
 *  peerDependencies
 * } = await getProjectDependencies({ packageJsonPath: './package.json' });
 * ```
 */
export async function getProjectDependencies({
  packageJsonPath,
}: {
  packageJsonPath: string;
}) {
  const packageJson = JSON.parse(await readFile(packageJsonPath));

  const dependencies: Dependencies = packageJson.dependencies || {};
  const devDependencies: Dependencies = packageJson.devDependencies || {};
  const peerDependencies: Dependencies = packageJson.peerDependencies || {};

  return {
    dependencies,
    devDependencies,
    peerDependencies,
  };
}
