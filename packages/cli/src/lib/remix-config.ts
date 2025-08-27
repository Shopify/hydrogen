import {createRequire} from 'node:module';
import path from 'node:path';
import {readdir} from 'node:fs/promises';
import {AbortError} from '@shopify/cli-kit/node/error';
import {outputWarn} from '@shopify/cli-kit/node/output';
import {muteRemixLogs} from './log.js';
import {REQUIRED_REMIX_VERSION} from './remix-version-check.js';
import {findFileWithExtension} from './file.js';
import {
  getViteConfig,
  isViteProject,
  REMIX_COMPILER_ERROR_MESSAGE,
} from './vite-config.js';
import {importLocal, importVite} from './import-utils.js';
import {hydrogenPackagesPath, isHydrogenMonorepo} from './build.js';

export type ResolvedRoute = {
  id: string;
  file: string;
  path?: string;
  parentId?: string;
  index?: boolean;
  caseSensitive?: boolean;
};

export type ResolvedRoutes = {
  [key: string]: ResolvedRoute;
};

export type ResolvedRRConfig = {
  appDirectory: string;
  rootDirectory: string; // This is technically not coming from the React Router config
  serverEntryPoint: string; // This is technically not coming from the React Router config
  routes: ResolvedRoutes;
};

export async function hasRemixConfigFile(root: string) {
  const result = await findFileWithExtension(root, 'remix.config');
  return !!result.filepath;
}

export async function isClassicProject(root: string) {
  const isVite = await isViteProject(root);
  if (isVite) return false;

  return hasRemixConfigFile(root);
}

const BUILD_DIR = 'dist'; // Hardcoded in Oxygen
const CLIENT_SUBDIR = 'client';
const SERVER_SUBDIR = 'server'; // React Router 7.8.x+ structure

const oxygenServerMainFields = ['browser', 'module', 'main'];

export function getProjectPaths(appPath?: string) {
  const root = appPath ?? process.cwd();
  const publicPath = path.join(root, 'public');
  const buildPath = path.join(root, BUILD_DIR);
  const buildPathClient = path.join(buildPath, CLIENT_SUBDIR);

  // React Router 7.8.x compatibility: Default to new server structure
  // Runtime fallback will be handled by MiniOxygen if file doesn't exist
  const buildPathWorkerFile = path.join(buildPath, SERVER_SUBDIR, 'index.js');

  return {
    root,
    buildPath,
    buildPathClient,
    buildPathWorkerFile,
    publicPath,
  };
}

export function handleRemixImportFail(): never {
  const remixVersion = REQUIRED_REMIX_VERSION;
  throw new AbortError(
    'Could not load Remix packages.',
    `Please make sure you have \`@remix-run/dev@${remixVersion}\` installed` +
      ` and all the other Remix packages have the same version.`,
  );
}

export function getRawRemixConfig(root: string) {
  return findFileWithExtension(root, 'remix.config').then(({filepath}) => {
    if (!filepath) throw new AbortError('No remix.config.js file found.');
    return createRequire(import.meta.url)(filepath);
  });
}

export async function getRemixConfig(
  root: string,
  mode = process.env.NODE_ENV,
): Promise<ResolvedRRConfig> {
  if (!(await isViteProject(root))) {
    throw new AbortError(REMIX_COMPILER_ERROR_MESSAGE);
  }
  return (await getViteConfig(root)).remixConfig;
}
