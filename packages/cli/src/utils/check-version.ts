import path from 'path';
import {createRequire} from 'module';
import {checkForNewVersion} from '@shopify/cli-kit/node/node-package-manager';
import {renderInfo} from '@shopify/cli-kit/node/ui';

const PACKAGE_NAME = '@shopify/hydrogen';

export async function checkHydrogenVersion(directory: string) {
  if (process.env.LOCAL_DEV) return;

  const require = createRequire(import.meta.url);
  const pkgJsonPath = locateDependency(
    require,
    directory,
    path.join(PACKAGE_NAME, 'package.json'),
  );

  if (!pkgJsonPath) return;

  const currentVersion = require(pkgJsonPath).version as string;

  if (!currentVersion) return;

  const newVersionAvailable = await checkForNewVersion(
    PACKAGE_NAME,
    currentVersion,
  );

  if (!newVersionAvailable) return;

  return () =>
    renderInfo({
      headline: 'Upgrade available',
      body:
        `Version ${newVersionAvailable} of ${PACKAGE_NAME} is now available.\n\n` +
        `You are currently running v${currentVersion}.`,
      reference: [
        {
          link: {
            label: 'Hydrogen releases',
            url: 'https://github.com/Shopify/hydrogen/releases',
          },
        },
      ],
    });
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
