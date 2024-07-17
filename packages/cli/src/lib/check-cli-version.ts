import {fileURLToPath} from 'node:url';
import {
  type PackageManager,
  checkForNewVersion,
  findUpAndReadPackageJson,
  packageManagerFromUserAgent,
} from '@shopify/cli-kit/node/node-package-manager';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {} from '@shopify/cli-kit/node/path';
import {isHydrogenMonorepo} from './build.js';
import {inferPackageManagerForGlobalCLI} from '@shopify/cli-kit/node/is-global';

export const UPGRADABLE_CLI_NAMES = {
  cli: '@shopify/cli',
  cliHydrogen: '@shopify/cli-hydrogen',
  createApp: '@shopify/create-hydrogen',
} as const;

/**
 * Checks if a new version of the current package is available.
 * @returns A function to show the update information if any update is available.
 */
export async function checkCurrentCLIVersion() {
  if (isHydrogenMonorepo && !process.env.SHOPIFY_UNIT_TEST) return;

  const {content: pkgJson} = await findUpAndReadPackageJson(
    fileURLToPath(import.meta.url),
  ).catch(() => ({content: undefined}));

  const pkgName = pkgJson?.name;
  const currentVersion = pkgJson?.version;

  if (
    !pkgName ||
    !currentVersion ||
    !Object.values(UPGRADABLE_CLI_NAMES).some((name) => name === pkgName) ||
    currentVersion.includes('next') ||
    currentVersion.includes('experimental') ||
    currentVersion.includes('snapshot')
  ) {
    return;
  }

  const newVersionAvailable = await checkForNewVersion(pkgName, currentVersion);

  if (!newVersionAvailable) return;

  const reference = [
    {
      link: {
        label: 'Hydrogen releases',
        url: 'https://github.com/Shopify/hydrogen/releases',
      },
    },
  ];

  if (pkgName === UPGRADABLE_CLI_NAMES.cli) {
    reference.push({
      link: {
        label: 'Global CLI reference',
        url: 'https://shopify.dev/docs/api/shopify-cli/',
      },
    });
  }

  return (packageManager?: PackageManager) => {
    packageManager ??= packageManagerFromUserAgent();
    if (packageManager === 'unknown' || !packageManager) {
      packageManager = inferPackageManagerForGlobalCLI();
    }
    if (packageManager === 'unknown') {
      packageManager = 'npm';
    }

    const installMessage =
      pkgName === UPGRADABLE_CLI_NAMES.cli
        ? `Please install the latest Shopify CLI version with \`${
            packageManager === 'yarn'
              ? `yarn global add ${UPGRADABLE_CLI_NAMES.cli}`
              : `${packageManager} install -g ${UPGRADABLE_CLI_NAMES.cli}`
          }\` and try again.`
        : `Please use the latest version with \`${packageManager} create @shopify/hydrogen@latest\``;

    renderInfo({
      headline: 'Upgrade available',
      body:
        `Version ${newVersionAvailable} of ${pkgName} is now available.\n` +
        `You are currently running v${currentVersion}.\n\n` +
        installMessage,
      reference,
    });

    return {currentVersion, newVersion: newVersionAvailable};
  };
}
