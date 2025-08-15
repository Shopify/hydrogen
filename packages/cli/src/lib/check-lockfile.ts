import {fileExists} from '@shopify/cli-kit/node/fs';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {checkIfIgnoredInGitRepository} from '@shopify/cli-kit/node/git';
import {renderWarning} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {packageManagers, type PackageManager} from './package-managers.js';
import {isHydrogenMonorepo} from './build.js';

function missingLockfileWarning(shouldExit: boolean) {
  const headline = 'No lockfile found';
  const body =
    `If you don’t commit a lockfile, then your app might install the wrong ` +
    `package versions when deploying. To avoid versioning issues, generate a ` +
    `new lockfile and commit it to your repository.`;
  const nextSteps = [
    [
      'Generate a lockfile. Run',
      {
        command: 'npm|yarn|pnpm install',
      },
    ],
    'Commit the new file to your repository',
  ];

  if (shouldExit) {
    throw new AbortError(headline, body, nextSteps);
  } else {
    renderWarning({headline, body, nextSteps});
  }
}

function multipleLockfilesWarning(
  packageManagers: PackageManager[],
  shouldExit: boolean,
) {
  const lockfileList = packageManagers.map(({name, lockfile}) => {
    return `${lockfile} (created by ${name})`;
  });

  const headline = 'Multiple lockfiles found';
  const body = [
    `Your project contains more than one lockfile. This can cause version ` +
      `conflicts when installing and deploying your app. The following ` +
      `lockfiles were detected:\n`,
    {list: {items: lockfileList}},
  ];
  const nextSteps = [
    'Delete any unneeded lockfiles',
    'Commit the change to your repository',
  ];

  if (shouldExit) {
    throw new AbortError(headline, body, nextSteps);
  } else {
    renderWarning({headline, body, nextSteps});
  }
}

function lockfileIgnoredWarning(lockfile: string) {
  const headline = 'Lockfile ignored by Git';
  const body =
    `Your project’s lockfile isn’t being tracked by Git. If you don’t commit ` +
    `a lockfile, then your app might install the wrong package versions when ` +
    `deploying.`;
  const nextSteps = [
    `In your project’s .gitignore file, delete any references to ${lockfile}`,
    'Commit the change to your repository',
  ];

  renderWarning({headline, body, nextSteps});
}

export async function checkLockfileStatus(
  directory: string,
  shouldExit = false,
) {
  // Debug logging for CI
  if (process.env.CI) {
    console.log('[Lockfile Check Debug]');
    console.log('  Directory:', directory);
    console.log(
      '  SHOPIFY_HYDROGEN_FLAG_LOCKFILE_CHECK:',
      process.env.SHOPIFY_HYDROGEN_FLAG_LOCKFILE_CHECK,
    );
    console.log('  SHOPIFY_UNIT_TEST:', process.env.SHOPIFY_UNIT_TEST);
    console.log('  isHydrogenMonorepo:', isHydrogenMonorepo);
    console.log('  CI:', process.env.CI);
  }

  // Check if SHOPIFY_HYDROGEN_FLAG_LOCKFILE_CHECK is explicitly false
  // This environment variable is set in CI to skip lockfile checks
  if (process.env.SHOPIFY_HYDROGEN_FLAG_LOCKFILE_CHECK === 'false') {
    if (process.env.CI)
      console.log('  Skipping: SHOPIFY_HYDROGEN_FLAG_LOCKFILE_CHECK is false');
    return;
  }

  // Skip lockfile check if we're building within the Hydrogen monorepo
  // This includes both local development and CI builds of templates
  // But NOT when running unit tests (which use temp directories)
  if (isHydrogenMonorepo && !process.env.SHOPIFY_UNIT_TEST) {
    // Check if we're in a template directory (e.g., templates/skeleton)
    // or if we're running from packages directory
    const normalizedPath = directory.replace(/\\/g, '/');
    if (
      normalizedPath.includes('/templates/') ||
      normalizedPath.includes('/packages/')
    ) {
      if (process.env.CI)
        console.log('  Skipping: In monorepo templates/packages directory');
      return;
    }
  }

  // Additional check for CI: if we're in a hydrogen/templates directory structure
  // This handles cases where the CLI is installed and running from node_modules
  // but we're still within the monorepo structure
  const normalizedPath = directory.replace(/\\/g, '/');
  if (normalizedPath.includes('/hydrogen/templates/')) {
    // Verify this is actually the monorepo by checking for turbo.json
    const turboPath = resolvePath(directory, '../../turbo.json');
    if (await fileExists(turboPath)) {
      if (process.env.CI)
        console.log('  Skipping: In hydrogen/templates with turbo.json');
      return;
    }
  }

  if (process.env.CI) console.log('  Proceeding with lockfile check');

  const foundPackageManagers: PackageManager[] = [];
  for (const packageManager of packageManagers) {
    if (await fileExists(resolvePath(directory, packageManager.lockfile))) {
      foundPackageManagers.push(packageManager);
    }
  }

  if (foundPackageManagers.length === 0) {
    return missingLockfileWarning(shouldExit);
  }

  if (foundPackageManagers.length > 1) {
    return multipleLockfilesWarning(foundPackageManagers, shouldExit);
  }

  const lockfile = foundPackageManagers[0]!.lockfile;
  const ignoredLockfile = await checkIfIgnoredInGitRepository(directory, [
    lockfile,
  ]).catch(() => {
    // Not a Git repository, ignore
    return [];
  });

  if (ignoredLockfile.length > 0) {
    lockfileIgnoredWarning(lockfile);
  }
}
