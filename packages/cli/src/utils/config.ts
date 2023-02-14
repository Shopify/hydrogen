import type {ServerMode} from '@remix-run/dev/dist/config/serverModes.js';
import type {RemixConfig} from '@remix-run/dev/dist/config.js';
import {renderFatalError} from '@shopify/cli-kit/node/ui';
import {output, file} from '@shopify/cli-kit';
import {createRequire} from 'module';
import {fileURLToPath} from 'url';
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

  return {
    root,
    buildPath,
    buildPathClient,
    buildPathWorkerFile,
    publicPath,
  };
}

export async function getRemixConfig(
  root: string,
  mode = process.env.NODE_ENV as ServerMode,
) {
  const {readConfig} = await import('@remix-run/dev/dist/config.js');
  const config = (await readConfig(root, mode)) as RemixConfig & {
    serverConditions?: string[];
    serverMainFields?: string[];
    serverDependenciesToBundle?: string;
  };

  // TODO: Remove when updating Remix
  if (!config.serverConditions) {
    const require = createRequire(import.meta.url);
    const actualConfigFile = require(path.join(root, 'remix.config'));
    config.serverBuildTarget = 'cloudflare-workers';
    config.serverConditions = actualConfigFile.serverConditions;
    config.serverMainFields = actualConfigFile.serverMainFields;
  }

  if (!config.serverEntryPoint) {
    throwConfigError(
      'Could not find a server entry point.',
      'Please add a server option to your remix.config.js pointing to an Oxygen worker entry file.',
    );
  } else {
    assertEntryFileExists(config.rootDirectory, config.serverEntryPoint);
  }

  if (config.serverPlatform !== 'neutral') {
    throwConfigError(
      'The serverPlatform in remix.config.js must be "neutral".',
    );
  }

  if (config.serverModuleFormat !== 'esm') {
    throwConfigError(
      'The serverModuleFormat in remix.config.js must be "esm".',
    );
  }

  if (config.serverDependenciesToBundle !== 'all') {
    throwConfigError(
      'The serverDependenciesToBundle in remix.config.js must be "all".',
    );
  }

  if (!config.serverConditions?.includes('worker')) {
    throwConfigError(
      'The serverConditions in remix.config.js must include "worker".',
    );
  }

  if (
    process.env.NODE_ENV === 'development' &&
    !config.serverConditions?.includes('development')
  ) {
    output.warn(
      'Add `process.env.NODE_ENV` value to serverConditions in remix.config.js to enable debugging features in development.',
    );
  }

  const expectedServerMainFields = ['browser', 'module', 'main'];

  if (
    !config.serverMainFields ||
    !expectedServerMainFields.every(
      (v, i) => config.serverMainFields?.[i] === v,
    )
  ) {
    throwConfigError(
      `The serverMainFields in remix.config.js must be ${JSON.stringify(
        expectedServerMainFields,
      )}.`,
    );
  }

  const cdnUrl = process.env.HYDROGEN_ASSET_BASE_URL;
  if (cdnUrl && !config.publicPath.startsWith(cdnUrl)) {
    throwConfigError(
      'The publicPath in remix.config.js must be prepended with the value of `process.env.HYDROGEN_ASSET_BASE_URL`.',
    );
  }

  const expectedServerBuildPath = path.join(
    BUILD_DIR,
    WORKER_SUBDIR,
    'index.js',
  );
  if (config.serverBuildPath !== path.resolve(root, expectedServerBuildPath)) {
    throwConfigError(
      `The serverBuildPath in remix.config.js must be "${expectedServerBuildPath}".`,
    );
  }

  const expectedAssetsBuildDirectory = path.join(BUILD_DIR, CLIENT_SUBDIR);
  if (
    !config.assetsBuildDirectory.startsWith(
      path.resolve(root, expectedAssetsBuildDirectory),
    )
  ) {
    throwConfigError(
      `The assetsBuildDirectory in remix.config.js must be in "${expectedAssetsBuildDirectory}".`,
    );
  }

  if (process.env.LOCAL_DEV) {
    // Watch local packages when developing in Hydrogen repo
    const packagesPath = fileURLToPath(new URL('../../..', import.meta.url));
    config.watchPaths ??= [];

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

function throwConfigError(message: string, tryMessage: string | null = null) {
  renderFatalError({
    name: 'ConfigError',
    type: 0,
    message,
    tryMessage,
  });

  process.exit(1);
}

export async function assertEntryFileExists(
  root: string,
  fileRelative: string,
) {
  const fileAbsolute = path.resolve(root, fileRelative);
  const exists = await file.exists(fileAbsolute);

  if (!exists) {
    if (!path.extname(fileAbsolute)) {
      const {readdir} = await import('fs/promises');
      const files = await readdir(path.dirname(fileAbsolute));
      const exists = files.some((file) => {
        const {name, ext} = path.parse(file);
        return name === path.basename(fileAbsolute) && /^\.[jt]s$/.test(ext);
      });

      if (exists) return;
    }

    throwConfigError(
      `Entry file "${fileRelative}" not found.`,
      'Please ensure the file exists and that the path is correctly added to the `server` property in remix.config.js.',
    );
  }
}
