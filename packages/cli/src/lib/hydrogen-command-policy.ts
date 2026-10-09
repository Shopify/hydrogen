import {createRequire} from 'node:module';

import {joinPath} from '@shopify/cli-kit/node/path';
import {AbortError} from '@shopify/cli-kit/node/error';

/**
 * Rejects commands disabled by the installed Hydrogen version.
 */
export async function applyHydrogenCommandPolicy({
  id,
  projectPath,
}: {
  id?: string;
  projectPath: string;
}) {
  if (
    !id ||
    !isHydrogenProject(projectPath) ||
    !isHydrogenCommandDisabled(projectPath, id)
  ) {
    return false;
  }

  throw new AbortError(
    `\`shopify ${id.replace(/:/g, ' ')}\` is not supported by this version of Hydrogen`,
    'The installed version of @shopify/hydrogen disables this command.',
    ['Use your framework or package tooling instead.'],
  );
}

export function isHydrogenCommandDisabled(projectPath: string, id: string) {
  try {
    const require = createRequire(joinPath(projectPath, 'package.json'));
    const hydrogenPackageJson = require('@shopify/hydrogen/package.json');
    const disabledCommands =
      hydrogenPackageJson?.shopify?.cli?.disabledCommands;

    return Array.isArray(disabledCommands) && disabledCommands.includes(id);
  } catch {
    return false;
  }
}

export function isHydrogenProject(projectPath: string) {
  try {
    const require = createRequire(import.meta.url);
    const projectPackageJson = require(joinPath(projectPath, 'package.json'));

    return [
      projectPackageJson?.dependencies,
      projectPackageJson?.devDependencies,
      projectPackageJson?.peerDependencies,
    ].some((dependencies) => !!dependencies?.['@shopify/hydrogen']);
  } catch {
    return false;
  }
}
