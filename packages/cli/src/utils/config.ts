import type {ServerMode} from '@remix-run/dev/dist/config/serverModes.js';
import path from 'path';
import fs from 'fs/promises';

const BUILD_DIR = 'dist'; // Hardcoded in Oxygen
const CLIENT_SUBDIR = 'client';
const WORKER_SUBDIR = 'worker'; // Hardcoded in Oxygen

export function getProjectPaths(appPath?: string, entry?: string) {
  const root = appPath ?? process.cwd();
  const publicPath = path.join(root, 'public');
  const buildPath = path.join(root, BUILD_DIR);
  const buildPathClient = path.join(buildPath, CLIENT_SUBDIR);
  const buildPathWorkerFile = path.join(buildPath, WORKER_SUBDIR, 'index.js');
  const entryFile = entry ? path.join(root, entry) : '';

  return {
    root,
    entryFile,
    buildPath,
    buildPathClient,
    buildPathWorkerFile,
    publicPath,
  };
}

export async function getRemixConfig(
  root: string,
  entryFile: string,
  publicPath: string,
  mode = process.env.NODE_ENV as ServerMode,
) {
  const {readConfig} = await import('@remix-run/dev/dist/config.js');
  const config = await readConfig(root, mode);

  // const hydrogenAssetBase = process.env.HYDROGEN_ASSET_BASE_URL;
  // if (hydrogenAssetBase) {
  //   const suffix = config.publicPath?.replace(/\\/g, '/').replace(/^\//, '');
  //   config.publicPath = hydrogenAssetBase + suffix;
  // }

  // config.serverEntryPoint ??= entryFile;
  // config.serverBuildTarget = 'cloudflare-workers';
  // config.serverModuleFormat = 'esm';
  // config.serverPlatform = 'neutral';

  // config.serverBuildPath = path.resolve(
  //   root,
  //   path.join(BUILD_DIR, WORKER_SUBDIR, 'index.js'),
  // );
  // config.relativeAssetsBuildDirectory = path.join(
  //   BUILD_DIR,
  //   CLIENT_SUBDIR,
  //   'build',
  // );
  // config.assetsBuildDirectory = path.resolve(
  //   root,
  //   config.relativeAssetsBuildDirectory,
  // );

  config.watchPaths = [publicPath];

  if (process.env.LOCAL_DEV) {
    // Watch local packages when developing in Hydrogen repo
    const packagesPath = new URL('../../..', import.meta.url).pathname;

    config.watchPaths.push(
      ...(await fs.readdir(packagesPath)).map((pkg) =>
        path.resolve(packagesPath, pkg, 'dist', 'development', 'index.js'),
      ),
    );

    config.watchPaths.push(
      path.join(packagesPath, 'cli', 'dist', 'virtual-routes', '**', '*'),
    );
  }

  return config;
}
