import {fileURLToPath} from 'node:url';
import {execAsync} from './process.js';

export const GENERATOR_TEMPLATES_DIR = 'generator-templates';
export const GENERATOR_STARTER_DIR = 'starter';
export const GENERATOR_APP_DIR = 'app';
export const GENERATOR_ROUTE_DIR = 'routes';
export const GENERATOR_SETUP_ASSETS_DIR = 'assets';
export const GENERATOR_SETUP_ASSETS_SUB_DIRS = [
  'tailwind',
  'css-modules',
  'vanilla-extract',
  'postcss',
  'vite',
] as const;

export type AssetDir = (typeof GENERATOR_SETUP_ASSETS_SUB_DIRS)[number];

export function getAssetDir(feature: AssetDir) {
  if (process.env.NODE_ENV === 'test') {
    return fileURLToPath(
      new URL(`../setup-assets/${feature}`, import.meta.url),
    );
  }

  return fileURLToPath(
    new URL(
      `./${GENERATOR_TEMPLATES_DIR}/${GENERATOR_SETUP_ASSETS_DIR}/${feature}`,
      import.meta.url,
    ),
  );
}

export function getTemplateAppFile(filepath: string, root = getStarterDir()) {
  const url = new URL(
    `${root}/${GENERATOR_APP_DIR}${filepath ? `/${filepath}` : ''}`,
    import.meta.url,
  );
  return url.protocol === 'file:' ? fileURLToPath(url) : url.toString();
}

export function getStarterDir() {
  if (process.env.NODE_ENV === 'test') {
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
