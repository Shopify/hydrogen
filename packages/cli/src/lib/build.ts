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
// Keep as build-time constant for backward compatibility
export const isHydrogenMonorepo = existsSync(skeletonPath);
export const hydrogenPackagesPath = isHydrogenMonorepo
  ? monorepoPackagesPath
  : undefined;

/**
 * Runtime check if a given directory is within the Hydrogen monorepo
 */
export function isInsideHydrogenMonorepo(directory?: string): boolean {
  // First check from the CLI's perspective (build-time)
  if (isHydrogenMonorepo) return true;
  
  // Then check from the given directory's perspective (runtime)
  if (!directory) return false;
  
  // Look for monorepo markers by traversing up from the directory
  let currentDir = directory;
  const maxLevels = 10; // Prevent infinite loops
  let levels = 0;
  
  while (currentDir && levels < maxLevels) {
    // Check if templates/skeleton exists relative to current directory
    const templatesPath = joinPath(currentDir, 'templates', 'skeleton');
    if (existsSync(templatesPath)) {
      // Also verify it looks like the Hydrogen monorepo
      const packagesPath = joinPath(currentDir, 'packages', 'cli');
      if (existsSync(packagesPath)) {
        return true;
      }
    }
    
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
    levels++;
  }
  
  return false;
}

/**
 * Get the monorepo root directory from a given path
 */
export function getMonorepoRoot(directory?: string): string | undefined {
  if (!directory) return undefined;
  
  let currentDir = directory;
  const maxLevels = 10;
  let levels = 0;
  
  while (currentDir && levels < maxLevels) {
    const templatesPath = joinPath(currentDir, 'templates', 'skeleton');
    const packagesPath = joinPath(currentDir, 'packages', 'cli');
    
    if (existsSync(templatesPath) && existsSync(packagesPath)) {
      return currentDir;
    }
    
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
    levels++;
  }
  
  return undefined;
}

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

export async function getStarterDir(workingDirectory?: string) {
  // Check if we're in the monorepo based on the working directory
  const monorepoRoot = getMonorepoRoot(workingDirectory);
  
  if (monorepoRoot) {
    // Use the skeleton source from the monorepo
    const sourceDir = joinPath(monorepoRoot, 'templates', 'skeleton');
    if (existsSync(sourceDir)) {
      return sourceDir;
    }
  }
  
  // Fall back to the build-time check for backward compatibility
  if (isHydrogenMonorepo) {
    return getSkeletonSourceDir();
  }
  
  // Use bundled assets as last resort
  const assetsDir = await getAssetsDir(ASSETS_STARTER_DIR);
  return assetsDir;
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
