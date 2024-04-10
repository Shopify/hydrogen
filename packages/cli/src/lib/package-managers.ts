import {
  type Lockfile,
  type PackageManager as Name,
} from '@shopify/cli-kit/node/node-package-manager';

export interface PackageManager {
  name: Name;
  lockfile: Lockfile;
  installCommand: string;
}

export const packageManagers: PackageManager[] = [
  {
    name: 'npm',
    lockfile: 'package-lock.json',
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
    installCommand: 'bun install --frozen-lockfile',
  },
];
