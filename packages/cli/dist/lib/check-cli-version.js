import { fileURLToPath } from 'node:url';
import { findUpAndReadPackageJson, checkForNewVersion, packageManagerFromUserAgent } from '@shopify/cli-kit/node/node-package-manager';
import { renderInfo } from '@shopify/cli-kit/node/ui';
import { isHydrogenMonorepo } from './build.js';
import { inferPackageManagerForGlobalCLI } from '@shopify/cli-kit/node/is-global';

const UPGRADABLE_CLI_NAMES = {
  cli: "@shopify/cli",
  cliHydrogen: "@shopify/cli-hydrogen",
  createApp: "@shopify/create-hydrogen"
};
async function checkCurrentCLIVersion() {
  if (isHydrogenMonorepo && !process.env.SHOPIFY_UNIT_TEST) return;
  const { content: pkgJson } = await findUpAndReadPackageJson(
    fileURLToPath(import.meta.url)
  ).catch(() => ({ content: void 0 }));
  const pkgName = pkgJson?.name;
  const currentVersion = pkgJson?.version;
  if (!pkgName || !currentVersion || !Object.values(UPGRADABLE_CLI_NAMES).some((name) => name === pkgName) || currentVersion.includes("next") || currentVersion.includes("experimental")) {
    return;
  }
  const newVersionAvailable = await checkForNewVersion(pkgName, currentVersion);
  if (!newVersionAvailable) return;
  const reference = [
    {
      link: {
        label: "Hydrogen releases",
        url: "https://github.com/Shopify/hydrogen/releases"
      }
    }
  ];
  if (pkgName === UPGRADABLE_CLI_NAMES.cli) {
    reference.push({
      link: {
        label: "Global CLI reference",
        url: "https://shopify.dev/docs/api/shopify-cli/"
      }
    });
  }
  return (packageManager) => {
    packageManager ??= packageManagerFromUserAgent();
    if (packageManager === "unknown" || !packageManager) {
      packageManager = inferPackageManagerForGlobalCLI();
    }
    if (packageManager === "unknown") {
      packageManager = "npm";
    }
    const installMessage = pkgName === UPGRADABLE_CLI_NAMES.cli ? `Please install the latest Shopify CLI version with \`${packageManager === "yarn" ? `yarn global add ${UPGRADABLE_CLI_NAMES.cli}` : `${packageManager} install -g ${UPGRADABLE_CLI_NAMES.cli}`}\` and try again.` : `Please use the latest version with \`${packageManager} create @shopify/hydrogen@latest\``;
    renderInfo({
      headline: "Upgrade available",
      body: `Version ${newVersionAvailable} of ${pkgName} is now available.
You are currently running v${currentVersion}.

` + installMessage,
      reference
    });
    return { currentVersion, newVersion: newVersionAvailable };
  };
}

export { UPGRADABLE_CLI_NAMES, checkCurrentCLIVersion };
