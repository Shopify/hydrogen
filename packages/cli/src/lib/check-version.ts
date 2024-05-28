import path from 'node:path';
import {createRequire} from 'node:module';
import {checkForNewVersion} from '@shopify/cli-kit/node/node-package-manager';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {CLI_KIT_VERSION} from '@shopify/cli-kit/common/version';

const PACKAGE_NAMES = {
  main: '@shopify/hydrogen',
  cliHydrogen: '@shopify/cli-hydrogen',
  cli: '@shopify/cli',
} as const;

/**
 *
 * @param resolveFrom Path to a directory to resolve from, or directly the path to a package.json file.
 * @param pkgKey Package to check for updates.
 * @returns A function to show the update information if any update is available.
 */
export async function checkHydrogenVersion(
  resolveFrom: string,
  pkgKey: keyof typeof PACKAGE_NAMES = 'main',
) {
  if (process.env.LOCAL_DEV) return;
  const pkgName = PACKAGE_NAMES[pkgKey];

  let currentVersion: string | undefined;
  if (pkgName === PACKAGE_NAMES.cli) {
    currentVersion = CLI_KIT_VERSION;
  } else {
    currentVersion = getCurrentVersionFromPackageJson(pkgName, resolveFrom);
  }

  if (!currentVersion || currentVersion.includes('next')) return;

  const newVersionAvailable = await checkForNewVersion(pkgName, currentVersion);

  if (!newVersionAvailable) return;

  return (extraMessage = '') => {
    renderInfo({
      headline: 'Upgrade available',
      body:
        `Version ${newVersionAvailable} of ${pkgName} is now available.\n` +
        `You are currently running v${currentVersion}.` +
        (extraMessage ? '\n\n' : '') +
        extraMessage,
      reference: [
        {
          link: {
            label: 'Hydrogen releases',
            url: 'https://github.com/Shopify/hydrogen/releases',
          },
        },
      ],
    });

    return {currentVersion, newVersion: newVersionAvailable};
  };
}

function getCurrentVersionFromPackageJson(
  pkgName: string,
  resolveFrom: string,
) {
  const require = createRequire(import.meta.url);
  const pkgJsonPath = resolveFrom.endsWith('package.json')
    ? locateDependency(require, resolveFrom)
    : locateDependency(
        require,
        path.join(pkgName, 'package.json'),
        resolveFrom,
      );

  if (!pkgJsonPath) return;

  const currentVersion = require(pkgJsonPath).version as string;
  return currentVersion;
}

function locateDependency(
  require: NodeRequire,
  nameToResolve: string,
  resolveFrom?: string,
) {
  try {
    return require.resolve(nameToResolve, {
      paths: [resolveFrom ?? process.cwd()],
    });
  } catch {
    return;
  }
}
