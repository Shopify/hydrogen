import type {ServerMode} from '@remix-run/dev/dist/config/serverModes.js';
import {readConfig, type RemixConfig} from '@remix-run/dev/dist/config.js';
import {createRequire} from 'module';
import path from 'path';
import fs from 'fs-extra';

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

let cachedConfig: RemixConfig;
export async function getRemixConfig(
  root: string,
  entryFile: string,
  publicPath: string,
  bustCacheFile?: string,
  mode = process.env.NODE_ENV as ServerMode,
) {
  if (!cachedConfig || bustCacheFile) {
    let env = process.env.NODE_ENV;

    if (bustCacheFile) {
      // Force using `require` in Remix instead
      // of `import` and and bust the cache to
      // load a fresh config file.
      const require = createRequire(import.meta.url);
      delete require.cache[bustCacheFile];
      process.env.NODE_ENV = 'test';
    }

    const config = await readConfig(root, mode);
    process.env.NODE_ENV = env;

    const hydrogenAssetBase = process.env.HYDROGEN_ASSET_BASE_URL;
    if (hydrogenAssetBase) {
      const suffix = config.publicPath?.replace(/\\/g, '/').replace(/^\//, '');
      config.publicPath = hydrogenAssetBase + suffix;
    }

    config.serverEntryPoint ??= entryFile;
    config.serverBuildTarget = 'cloudflare-workers';
    config.serverModuleFormat = 'esm';
    config.serverPlatform = 'neutral';

    config.serverBuildPath = path.resolve(
      root,
      path.join(BUILD_DIR, WORKER_SUBDIR, 'index.js'),
    );
    config.relativeAssetsBuildDirectory = path.join(
      BUILD_DIR,
      CLIENT_SUBDIR,
      'build',
    );
    config.assetsBuildDirectory = path.resolve(
      root,
      config.relativeAssetsBuildDirectory,
    );

    config.watchPaths = [publicPath, path.resolve(root, 'remix.config.*')];

    if (process.env.LOCAL_DEV) {
      // Watch local packages when developing in Hydrogen repo
      const require = createRequire(import.meta.url);
      const packagesPath = path.resolve(
        // TODO: Change package name when we have one
        path.dirname(require.resolve('@shopify/h2-test-hydrogen')),
        '..',
        '..',
      );

      config.watchPaths.push(
        ...(await fs.readdir(packagesPath)).flatMap((pkg) => {
          const files = [
            path.resolve(packagesPath, pkg, 'dist', 'development', 'index.js'),
          ];

          if (pkg === 'hydrogen-remix') {
            files.push(
              path.resolve(packagesPath, pkg, 'dist', 'build', 'index.js'),
              path.resolve(packagesPath, pkg, 'src', 'templates', '**', '*'),
            );
          }

          return files;
        }),
      );
    }

    cachedConfig = config;
  }

  return cachedConfig;
}
