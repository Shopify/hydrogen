import path from 'path';
import {createRequire} from 'module';
import {checkForNewVersion} from '@shopify/cli-kit/node/node-package-manager';
import {renderInfo} from '@shopify/cli-kit/node/ui';

const PACKAGE_NAMES = {
  main: '@shopify/hydrogen',
  cli: '@shopify/cli-hydrogen',
} as const;

export async function checkHydrogenVersion(
  directory: string,
  pkgKey: keyof typeof PACKAGE_NAMES = 'main',
) {
  if (process.env.LOCAL_DEV) return;
  const pkgName = PACKAGE_NAMES[pkgKey];

  const require = createRequire(import.meta.url);
  const pkgJsonPath = locateDependency(
    require,
    directory,
    path.join(pkgName, 'package.json'),
  );

  if (!pkgJsonPath) return;

  const currentVersion = require(pkgJsonPath).version as string;

  if (!currentVersion) return;

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

function locateDependency(
  require: NodeRequire,
  directory: string,
  name: string,
) {
  try {
    return require.resolve(name, {paths: [directory]});
  } catch {
    return;
  }
}
