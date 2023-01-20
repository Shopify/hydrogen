import {renderWarning} from '@shopify/cli-kit/node/ui'
import {lockfiles} from '@shopify/cli-kit/node/node-package-manager'
import {file} from '@shopify/cli-kit'
import {git} from '@shopify/cli-kit'
import {path} from '@shopify/cli-kit'
import type {Lockfile} from '@shopify/cli-kit/node/node-package-manager'

function missingLockfileWarning() {
  renderWarning({
    headline: 'No lockfile found',
    body:
      `If you don’t commit a lockfile, then your app might install the wrong ` +
      `package versions when deploying. To avoid versioning issues, generate a ` +
      `new lockfile and commit it to your repository.`,
    nextSteps: [
      [
        'Generate a lockfile. Run',
        {
          command: 'npm|yarn|pnpm install',
        },
      ],
      'Commit the new file to your repository',
    ],
  })
}

function multipleLockfilesWarning(lockfiles: Lockfile[]) {
  const packageManagers = {
    'yarn.lock': 'yarn',
    'package-lock.json': 'npm',
    'pnpm-lock.yaml': 'pnpm',
  }

  const lockfileList = lockfiles.map((lockfile) => {
    return `${lockfile} (created by ${packageManagers[lockfile]})`
  })

  renderWarning({
    headline: 'Multiple lockfiles found',
    body: [
      `Your project contains more than one lockfile. This can cause version ` +
        `conflicts when installing and deploying your app. The following ` +
        `lockfiles were detected:\n`,
      {list: {items: lockfileList}},
    ],
    nextSteps: ['Delete any unneeded lockfiles', 'Commit the change to your repository'],
  })
}

function lockfileIgnoredWarning(lockfile: string) {
  renderWarning({
    headline: 'Lockfile ignored by Git',
    body:
      `Your project’s lockfile isn’t being tracked by Git. If you don’t commit ` +
      `a lockfile, then your app might install the wrong package versions when ` +
      `deploying.`,
    nextSteps: [
      `In your project’s .gitignore file, delete any references to ${lockfile}`,
      'Commit the change to your repository',
    ],
  })
}

type LockFileStatus = 'missing' | 'multiple' | 'ignored' | 'ok'

export async function checkLockfileStatus(directory: string): Promise<LockFileStatus> {
  const availableLockfiles = await lockfiles.reduce(async (acc, lockFileName) => {
    const lockfilePath = path.resolve(directory, lockFileName)
    if (await file.exists(lockfilePath)) {
      return (await acc).concat(lockFileName)
    } else {
      return acc
    }
  }, Promise.resolve([] as Lockfile[]))

  if (!availableLockfiles.length) {
    missingLockfileWarning()
    return 'missing'
  }

  if (availableLockfiles.length > 1) {
    multipleLockfilesWarning(availableLockfiles)
    return 'multiple'
  }

  const repo = git.factory(directory)
  const lockfile = availableLockfiles[0]!
  const ignoredLockfile = await repo.checkIgnore([lockfile])

  if (ignoredLockfile.length) {
    lockfileIgnoredWarning(lockfile)
    return 'ignored'
  }

  return 'ok'
}
