import { fileExists } from '@shopify/cli-kit/node/fs';
import { resolvePath } from '@shopify/cli-kit/node/path';
import { checkIfIgnoredInGitRepository } from '@shopify/cli-kit/node/git';
import { renderWarning } from '@shopify/cli-kit/node/ui';
import { AbortError } from '@shopify/cli-kit/node/error';
import { packageManagers } from './package-managers.js';
import { isHydrogenMonorepo } from './build.js';

function missingLockfileWarning(shouldExit) {
  const headline = "No lockfile found";
  const body = `If you don\u2019t commit a lockfile, then your app might install the wrong package versions when deploying. To avoid versioning issues, generate a new lockfile and commit it to your repository.`;
  const nextSteps = [
    [
      "Generate a lockfile. Run",
      {
        command: "npm|yarn|pnpm install"
      }
    ],
    "Commit the new file to your repository"
  ];
  if (shouldExit) {
    throw new AbortError(headline, body, nextSteps);
  } else {
    renderWarning({ headline, body, nextSteps });
  }
}
function multipleLockfilesWarning(packageManagers2, shouldExit) {
  const lockfileList = packageManagers2.map(({ name, lockfile }) => {
    return `${lockfile} (created by ${name})`;
  });
  const headline = "Multiple lockfiles found";
  const body = [
    `Your project contains more than one lockfile. This can cause version conflicts when installing and deploying your app. The following lockfiles were detected:
`,
    { list: { items: lockfileList } }
  ];
  const nextSteps = [
    "Delete any unneeded lockfiles",
    "Commit the change to your repository"
  ];
  if (shouldExit) {
    throw new AbortError(headline, body, nextSteps);
  } else {
    renderWarning({ headline, body, nextSteps });
  }
}
function lockfileIgnoredWarning(lockfile) {
  const headline = "Lockfile ignored by Git";
  const body = `Your project\u2019s lockfile isn\u2019t being tracked by Git. If you don\u2019t commit a lockfile, then your app might install the wrong package versions when deploying.`;
  const nextSteps = [
    `In your project\u2019s .gitignore file, delete any references to ${lockfile}`,
    "Commit the change to your repository"
  ];
  renderWarning({ headline, body, nextSteps });
}
async function checkLockfileStatus(directory, shouldExit = false) {
  if (isHydrogenMonorepo && !process.env.SHOPIFY_UNIT_TEST) return;
  const foundPackageManagers = [];
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
  const lockfile = foundPackageManagers[0].lockfile;
  const ignoredLockfile = await checkIfIgnoredInGitRepository(directory, [
    lockfile
  ]).catch(() => {
    return [];
  });
  if (ignoredLockfile.length > 0) {
    lockfileIgnoredWarning(lockfile);
  }
}

export { checkLockfileStatus };
