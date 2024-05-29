import {fileURLToPath} from 'node:url';
import {execAsync} from './process.js';
import {findPathUp} from '@shopify/cli-kit/node/fs';
import {AbortError} from '@shopify/cli-kit/node/error';
import {joinPath} from '@shopify/cli-kit/node/path';

export const GENERATOR_TEMPLATES_DIR = 'generator-templates';
export const GENERATOR_STARTER_DIR = 'starter';
export const GENERATOR_APP_DIR = 'app';
export const GENERATOR_ROUTE_DIR = 'routes';
export const GENERATOR_SETUP_ASSETS_SUB_DIRS = [
  'tailwind',
  'css-modules',
  'vanilla-extract',
  'postcss',
  'vite',
] as const;

export type AssetDir = (typeof GENERATOR_SETUP_ASSETS_SUB_DIRS)[number];

let pkgJsonPath: string | undefined;
export async function getAssetsDir() {
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

  return fileURLToPath(
    new URL(
      `./${process.env.SHOPIFY_UNIT_TEST ? '/' : 'dist/'}assets/hydrogen`,
      pkgJsonPath,
    ),
  );
}

export async function getSetupAssetDir(feature: AssetDir) {
  const assetDir = await getAssetsDir();
  return joinPath(assetDir, 'setup', feature);
}

export function getTemplateAppFile(filepath: string, root = getStarterDir()) {
  const url = new URL(
    `${root}/${GENERATOR_APP_DIR}${filepath ? `/${filepath}` : ''}`,
    import.meta.url,
  );
  return url.protocol === 'file:' ? fileURLToPath(url) : url.toString();
}

export function getStarterDir(useSource = !!process.env.SHOPIFY_UNIT_TEST) {
  if (useSource) {
    return getSkeletonSourceDir();
  }

  return fileURLToPath(
    new URL(
      `./${GENERATOR_TEMPLATES_DIR}/${GENERATOR_STARTER_DIR}`,
      import.meta.url,
    ),
  );
}

export function getSkeletonSourceDir() {
  return fileURLToPath(
    new URL(`../../../../templates/skeleton`, import.meta.url),
  );
}

export async function getRepoNodeModules() {
  const {stdout} = await execAsync('npm root');
  return (
    stdout.trim() ||
    fileURLToPath(new URL(`../../../../node_modules`, import.meta.url))
  );
}
