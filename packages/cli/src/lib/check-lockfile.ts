import {fileExists} from '@shopify/cli-kit/node/fs';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {checkIfIgnoredInGitRepository} from '@shopify/cli-kit/node/git';
import {renderWarning} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  lockfiles,
  type Lockfile,
} from '@shopify/cli-kit/node/node-package-manager';

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

function multipleLockfilesWarning(lockfiles: Lockfile[], shouldExit: boolean) {
  const packageManagers = {
    'bun.lockb': 'bun',
    'yarn.lock': 'yarn',
    'package-lock.json': 'npm',
    'pnpm-lock.yaml': 'pnpm',
  };

  const lockfileList = lockfiles.map((lockfile) => {
    return `${lockfile} (created by ${packageManagers[lockfile]})`;
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
  if (process.env.LOCAL_DEV) return;

  const availableLockfiles: Lockfile[] = [];
  for (const lockFileName of lockfiles) {
    if (await fileExists(resolvePath(directory, lockFileName))) {
      availableLockfiles.push(lockFileName);
    }
  }

  if (availableLockfiles.length === 0) {
    return missingLockfileWarning(shouldExit);
  }

  if (availableLockfiles.length > 1) {
    return multipleLockfilesWarning(availableLockfiles, shouldExit);
  }

  const lockfile = availableLockfiles[0]!;
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
