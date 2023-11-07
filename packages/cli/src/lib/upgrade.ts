import path from 'path';
import {readFile} from '@shopify/cli-kit/node/fs';
import {PackageJson} from 'type-fest';
import type {Dependencies} from '../commands/hydrogen/upgrade.js';
import {getProjectPaths} from '../lib/remix-config.js';

/**
 * Gets the current @shopify/hydrogen version from the app's package.json
 */
export async function getHydrogenVersion({appPath}: {appPath: string}) {
  if (!appPath) {
    throw new Error('No app path provided');
  }

  const {root} = getProjectPaths(appPath);
  const packageJsonPath = path.join(root, 'package.json');

  if (!packageJsonPath) {
    throw new Error('No package.json found');
  }

  const packageJson = JSON.parse(
    await readFile(packageJsonPath),
  ) as PackageJson;

  const currentDependencies = {
    ...packageJson?.dependencies,
    ...packageJson?.devDependencies,
  } as Dependencies;

  if (!currentDependencies) {
    throw new Error('No dependencies found in package.json');
  }

  const currentVersion = currentDependencies?.['@shopify/hydrogen'];

  if (!currentVersion) {
    throw new Error(
      'The upgrade command can only be used in Hydrogen projects including @shopify/hydrogen as a dependency',
    );
  }

  return {currentVersion, currentDependencies};
}
