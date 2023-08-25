import path from 'path';
import fs from 'fs/promises';
import Command from '@shopify/cli-kit/node/base-command';
import {getPackageManager} from '@shopify/cli-kit/node/node-package-manager';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {commonFlags} from '../../lib/flags.js';
import {getProjectPaths} from '../../lib/remix-config.js';
// import {
//   getProjectDependencies,
//   displayCurrentVersions,
//   displayUpgradeSummary,
//   getUpgradeCommand,
//   upgradePackages,
//   promptForUpgrade,
//   displayUpgradePlan,
// } from './upgrade/index.js';
import {displayCurrentVersions} from './upgrade/displayCurrentVersions.js';
import {displayUpgradePlan} from './upgrade/displayUpgradePlan.js';
import {displayUpgradeSummary} from './upgrade/displayUpgradeSummary.js';
import {getProjectDependencies} from './upgrade/getProjectDependencies.js';
import {getUpgradeCommand} from './upgrade/getUpgradeCommand.js';
import {promptForUpgrade} from './upgrade/promptForUpgrade.js';
import {upgradePackages} from './upgrade/upgradePackages.js';
import type {RenderCommandProps} from './upgrade/types.js';

export default class Upgrade extends Command {
  static description = 'Upgrade Remix and Hydrogen npm dependencies.';

  static flags = {
    path: commonFlags.path,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Upgrade);
    const appPath = flags.path ? path.resolve(flags.path) : process.cwd();
    await upgrade({appPath});
  }
}

/**
 * Upgrade hydrogen, cli-hydrogen, remix-oxygen, oxygen-workers-types, prettier-config,
 * @shopify/cli, remix-run/react and remix-run/dev npm dependencies.
 * @param appPath - Path to the Hydrogen app
 * @returns void
 */
export async function upgrade({appPath}: RenderCommandProps) {
  const {packageJsonPath} = getProjectPaths(appPath);
  const packageManager = await getPackageManager(appPath);

  try {
    await fs.access(packageJsonPath);
  } catch (error) {
    throw new Error(
      `No package.json found at ${packageJsonPath}. Consider using the --path flag to point to your Hydrogen app root folder.`,
    );
  }

  const {dependencies, devDependencies} = await getProjectDependencies({
    packageJsonPath,
  });

  displayCurrentVersions({dependencies, devDependencies});

  const packagesToUpdate = await promptForUpgrade({
    dependencies,
    devDependencies,
  });

  if (!packagesToUpdate || !packagesToUpdate?.length) {
    renderInfo({body: 'No packages to upgrade.'});
    return;
  }

  await displayUpgradePlan({packagesToUpdate});

  const cmd = await getUpgradeCommand({
    packageManager,
    packagesToUpdate,
  });

  if (
    !cmd ||
    (cmd.dependencies.length === 0 && cmd.devDependencies.length === 0)
  ) {
    throw new Error('There was an error generating the upgrade command.');
  }

  await upgradePackages({cmd, appPath});
  await displayUpgradeSummary({packageJsonPath, packagesToUpdate});
}
