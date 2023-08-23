import {getPackageManager} from '@shopify/cli-kit/node/node-package-manager';
import type {PackageToUpgrade, Cmd, CmdArgs} from './types.js';
import {execa} from 'execa';

/**
 * Get the npm, yarn or pnpm command to upgrade both dependencies and devDependencies
 * @param packageManager - The package manager to use
 * @param pkg - The package to upgrade
 * @returns Cmd
 **/
export async function getUpgradeCommand({
  packageManager,
  packagesToUpdate,
}: {
  packageManager: Awaited<ReturnType<typeof getPackageManager>>;
  packagesToUpdate: PackageToUpgrade[];
}) {
  const cmd = {
    dependencies: [],
    devDependencies: [],
  } as Cmd;

  // get the commands to upgrade for each package
  for (const pkg of packagesToUpdate) {
    let pkgCmd;
    if (
      pkg.name === '@shopify/hydrogen' ||
      pkg.name === '@shopify/cli-hydrogen'
    ) {
      pkgCmd = await getHydrogenUpgradeCommand({pkg});
    } else {
      // packages without dependencies
      pkgCmd = await getPackageUpgradeCommand({pkg});
    }

    cmd.dependencies.push(...pkgCmd.dependencies);
    cmd.devDependencies.push(...pkgCmd.devDependencies);
  }

  // adapt the upgrade command based on each package manager version
  switch (packageManager) {
    case 'npm':
      cmd.dependencies = ['npm', 'i', ...cmd.dependencies, '-P'];
      cmd.devDependencies = ['npm', 'i', '--save-dev', ...cmd.devDependencies];
      break;

    case 'yarn':
      cmd.dependencies = ['yarn', 'add', ...cmd.dependencies];
      cmd.devDependencies = ['yarn', 'add', '--dev', ...cmd.devDependencies];
      break;

    case 'pnpm':
      cmd.dependencies = ['pnpm', 'add', ...cmd.dependencies];
      cmd.devDependencies = [
        'pnpm',
        'add',
        '--save-dev',
        ...cmd.devDependencies,
      ];
      break;

    default:
      throw new Error(`Unsupported package manager: ${packageManager}`);
  }

  return cmd;
}

/**
 * Get the remix-run version to upgrade to based on the selected version
 * of the cli-hydrogen and hydrogen package dependencies
 * @returns Cmd
 **/
async function getRemixUpgradeCommand({pkg}: {pkg: PackageToUpgrade}): Promise<{
  dependencies: CmdArgs;
  devDependencies: CmdArgs;
}> {
  const {stdout: remixReactVersion} = await execa('npm', [
    'info',
    `${pkg.name}@${pkg.version}`,
    'peerDependencies.@remix-run/react',
  ]);

  const pinnedRemixReactVersion = remixReactVersion.startsWith('^')
    ? remixReactVersion.slice(1)
    : remixReactVersion;

  if (pkg.name === '@shopify/cli-hydrogen') {
    return {
      devDependencies: [`@remix-run/react@${pinnedRemixReactVersion}`],
      dependencies: [],
    };
  }

  if (pkg.name === '@shopify/hydrogen') {
    return {
      dependencies: [`@remix-run/react@${pinnedRemixReactVersion}`],
      devDependencies: [`@remix-run/dev@${pinnedRemixReactVersion}`],
    };
  }

  return {
    dependencies: [],
    devDependencies: [],
  };
}

/**
 * Get the hydrogen and cli-hydrogen version to upgrade to and their remix-run
 * dependencies based on the selected version of the cli-hydrogen and hydrogen
 * package dependencies
 * @param pkg - The package to upgrade
 * @returns Cmd
 **/
async function getHydrogenUpgradeCommand({
  pkg,
}: {
  pkg: PackageToUpgrade;
}): Promise<Cmd> {
  const remix = await getRemixUpgradeCommand({pkg});

  const pkgName = `${pkg.name}@${pkg.version}`;
  if (pkg.name === '@shopify/cli-hydrogen') {
    return {
      dependencies: remix.dependencies,
      devDependencies: [pkgName, ...remix.devDependencies],
    };
  }

  if (pkg.name === '@shopify/hydrogen') {
    return {
      dependencies: [pkgName, ...remix.dependencies],
      devDependencies: remix.devDependencies,
    };
  }

  throw new Error(`Unsupported package: ${pkg.name}`);
}

/**
 * Get the generic package upgrade command for any non hydrogen or cli-hydrogen
 * packages to upgrade
 * @param pkg - The package to upgrade
 * @returns Cmd
 **/
async function getPackageUpgradeCommand({pkg}: {pkg: PackageToUpgrade}) {
  let cmd: Cmd = {
    dependencies: [],
    devDependencies: [],
  };

  if (pkg.type === 'dependency') {
    cmd.dependencies.push(`${pkg.name}@${pkg.version}`);
  } else {
    cmd.devDependencies.push(`${pkg.name}@${pkg.version}`);
  }
  return cmd;
}
