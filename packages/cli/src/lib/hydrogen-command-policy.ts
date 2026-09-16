import {createRequire} from 'node:module';

import {outputNewline} from '@shopify/cli-kit/node/output';
import {joinPath} from '@shopify/cli-kit/node/path';
import {renderError} from '@shopify/cli-kit/node/ui';

/**
 * Returns true if the command has been marked as disabled and we've shown an
 * error to the user.
 */
export function applyHydrogenCommandPolicy({
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

  outputNewline();
  renderError({
    headline: `\`shopify ${id.replace(/:/g, ' ')}\` is not supported by this version of Hydrogen`,
    body: 'The installed version of @shopify/hydrogen disables this command.',
    nextSteps: ['Use your framework or package tooling instead.'],
  });

  return true;
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
