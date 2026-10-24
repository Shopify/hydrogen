import {fileExists} from '@shopify/cli-kit/node/fs';
import {dirname, joinPath, resolvePath} from '@shopify/cli-kit/node/path';
import {
  type Lockfile,
  type PackageManager as Name,
} from '@shopify/cli-kit/node/node-package-manager';

export interface PackageManager {
  name: Name;
  lockfile: Lockfile;
  alternativeLockfiles?: string[];
  installCommand: string;
}

export const packageManagers: PackageManager[] = [
  {
    name: 'npm',
    lockfile: 'package-lock.json',
    alternativeLockfiles: ['npm-shrinkwrap.json'],
    installCommand: 'npm ci',
  },
  {
    name: 'yarn',
    lockfile: 'yarn.lock',
    installCommand: 'yarn install --frozen-lockfile',
  },
  {
    name: 'pnpm',
    lockfile: 'pnpm-lock.yaml',
    installCommand: 'pnpm install --frozen-lockfile',
  },
  {
    name: 'bun',
    lockfile: 'bun.lockb',
    alternativeLockfiles: ['bun.lock'],
    installCommand: 'bun install --frozen-lockfile',
  },
];

// Matches cli-kit's lockfile precedence (yarn, pnpm, bun, npm) so the
// tie-break is unchanged when multiple lockfiles coexist in one directory.
const lockfileDetectionOrder: Name[] = ['yarn', 'pnpm', 'bun', 'npm'];

/**
 * Detects the package manager by searching for a known lockfile in
 * `directory` and, if none is found there, each ancestor directory in turn.
 * Monorepo workspaces keep the lockfile at the workspace root rather than in
 * each app directory, so checking only the app directory misses it. The
 * nearest lockfile wins, preserving single-repo behavior. Returns 'unknown'
 * when no lockfile exists up to `options.stopAt` (or the filesystem root).
 */
export async function findPackageManagerByLockfile(
  directory: string,
  options?: {stopAt?: string},
): Promise<Name> {
  let currentDirectory = resolvePath(directory);
  const stopAt = options?.stopAt ? resolvePath(options.stopAt) : undefined;

  for (;;) {
    for (const name of lockfileDetectionOrder) {
      const packageManager = packageManagers.find((pm) => pm.name === name);
      if (!packageManager) continue;

      const lockfiles = [
        packageManager.lockfile,
        ...(packageManager.alternativeLockfiles ?? []),
      ];

      for (const lockfile of lockfiles) {
        if (await fileExists(joinPath(currentDirectory, lockfile))) {
          return packageManager.name;
        }
      }
    }

    if (currentDirectory === stopAt) break;

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) break;
    currentDirectory = parentDirectory;
  }

  return 'unknown';
}
