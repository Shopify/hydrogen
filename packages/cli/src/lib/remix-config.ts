import {createRequire} from 'node:module';
import path from 'node:path';
import {readdir} from 'node:fs/promises';
import {AbortError} from '@shopify/cli-kit/node/error';
import {outputWarn} from '@shopify/cli-kit/node/output';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {muteRemixLogs} from './log.js';
import {REQUIRED_REMIX_VERSION, REQUIRED_REACT_ROUTER_VERSION} from './remix-version-check.js';
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
const WORKER_SUBDIR = 'worker'; // Hardcoded in Oxygen

const oxygenServerMainFields = ['browser', 'module', 'main'];

export function getProjectPaths(appPath?: string) {
  const root = appPath ?? process.cwd();
  const publicPath = path.join(root, 'public');
  const buildPath = path.join(root, BUILD_DIR);
  const buildPathClient = path.join(buildPath, CLIENT_SUBDIR);
  const buildPathWorkerFile = path.join(buildPath, WORKER_SUBDIR, 'index.js');

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
  const reactRouterVersion = REQUIRED_REACT_ROUTER_VERSION;
  throw new AbortError(
    'Could not load React Router or Remix packages.',
    `Please make sure you have either \`@react-router/dev@${reactRouterVersion}\` or \`@remix-run/dev@${remixVersion}\` installed` +
      ` and all the related packages have the same version.`,
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

async function assertEntryFileExists(root: string, fileRelative: string) {
  const fileAbsolute = path.resolve(root, fileRelative);
  const exists = await fileExists(fileAbsolute);

  if (!exists) {
    if (!path.extname(fileAbsolute)) {
      const files = await readdir(path.dirname(fileAbsolute));
      const exists = files.some((file) => {
        const {name, ext} = path.parse(file);
        return name === path.basename(fileAbsolute) && /^\.[jt]s$/.test(ext);
      });

      if (exists) return;
    }

    throw new AbortError(
      `Entry file "${fileRelative}" not found.`,
      'Please ensure the file exists and that the path is correctly added to the `server` property in remix.config.js.',
    );
  }
}
