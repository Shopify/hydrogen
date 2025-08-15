import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {findPathUp} from '@shopify/cli-kit/node/fs';
import {AbortError} from '@shopify/cli-kit/node/error';
import {dirname, joinPath} from '@shopify/cli-kit/node/path';
import {execAsync} from './process.js';

// Avoid using fileURLToPath here to prevent backslashes nightmare on Windows
const monorepoPackagesPath = new URL('../../..', import.meta.url).pathname;
// Check if we're in the Hydrogen monorepo by looking for the skeleton template
// relative to the packages directory
const skeletonPath = joinPath(
  dirname(monorepoPackagesPath),
  'templates',
  'skeleton',
);
export const isHydrogenMonorepo = existsSync(skeletonPath);
export const hydrogenPackagesPath = isHydrogenMonorepo
  ? monorepoPackagesPath
  : undefined;

// The global CLI will merge our assets with other
// plugins so we must namespace the directory:
export const ASSETS_DIR_PREFIX = 'assets/hydrogen';

export const ASSETS_STARTER_DIR = 'starter';
export const ASSETS_STARTER_DIR_ROUTES = 'routes';

export type AssetsDir =
  | 'tailwind'
  | 'vanilla-extract'
  | 'vite'
  | 'i18n'
  | 'routes'
  | 'bundle'
  // These are created at build time:
  | 'virtual-routes'
  | 'internal-templates'
  | 'external-templates'
  | typeof ASSETS_STARTER_DIR;

let pkgJsonPath: string | undefined;
export async function getPkgJsonPath() {
  pkgJsonPath ??= await findPathUp('package.json', {
    cwd: fileURLToPath(import.meta.url),
    type: 'file',
  });

  if (!pkgJsonPath) {
    throw new AbortError(
      'Could not find assets directory',
      'Please report this error.',
    );
  }

  return pkgJsonPath;
}

export async function getAssetsDir(feature?: AssetsDir, ...subpaths: string[]) {
  return joinPath(
    dirname(await getPkgJsonPath()),
    process.env.SHOPIFY_UNIT_TEST
      ? `assets` // Use source for unit tests
      : `dist/${ASSETS_DIR_PREFIX}`,
    feature ?? '',
    ...subpaths,
  );
}

export async function getTemplateAppFile(filepath: string, root?: string) {
  root ??= await getStarterDir();

  const url = new URL(
    `${root}/app${filepath ? `/${filepath}` : ''}`,
    import.meta.url,
  );
  return url.protocol === 'file:' ? fileURLToPath(url) : url.toString();
}

export function getStarterDir(useSource = !!process.env.SHOPIFY_UNIT_TEST) {
  if (useSource) return getSkeletonSourceDir();

  return getAssetsDir(ASSETS_STARTER_DIR);
}

export function getSkeletonSourceDir() {
  if (!isHydrogenMonorepo) {
    throw new AbortError(
      'Trying to use skeleton source dir outside of Hydrogen monorepo.',
      'Please report this error.',
    );
  }

  return joinPath(dirname(monorepoPackagesPath), 'templates', 'skeleton');
}

export function getSkeletonNodeModules(): string {
  return joinPath(getSkeletonSourceDir(), 'node_modules');
}

export async function getRepoNodeModules() {
  const {stdout} = await execAsync('npm root');
  let nodeModulesPath = stdout.trim();

  if (!nodeModulesPath && isHydrogenMonorepo) {
    nodeModulesPath = joinPath(dirname(monorepoPackagesPath), 'node_modules');
  }

  return nodeModulesPath;
}
