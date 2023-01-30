import path from 'path';
import {output} from '@shopify/cli-kit';
import colors from '@shopify/cli-kit/node/colors';
import {getProjectPaths, getRemixConfig} from '../../utils/config.js';
import {commonFlags} from '../../utils/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import Flags from '@oclif/core/lib/flags.js';
import {checkLockfileStatus} from '../../utils/check-lockfile.js';
import {findMissingRoutes} from '../../utils/missing-routes.js';

const LOG_WORKER_BUILT = '📦 Worker built';

// @ts-ignore
export default class Build extends Command {
  static description = 'Builds a Hydrogen storefront for production';
  static flags = {
    ...commonFlags,
    sourcemap: Flags.boolean({
      env: 'SHOPIFY_HYDROGEN_FLAG_SOURCEMAP',
    }),
    entry: Flags.string({
      env: 'SHOPIFY_HYDROGEN_FLAG_SOURCEMAP',
      required: true,
    }),
    disableRouteWarning: Flags.boolean({
      description: 'Disable warning about missing standard routes',
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_ROUTE_WARNING',
    }),
  };

  async run(): Promise<void> {
    // @ts-ignore
    const {flags} = await this.parse(Build);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    await runBuild({...flags, path: directory});
  }
}

export async function runBuild({
  entry,
  path: appPath,
  sourcemap = true,
  disableRouteWarning = false,
}: {
  entry: string;
  path?: string;
  sourcemap?: boolean;
  disableRouteWarning?: boolean;
}) {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }

  const {
    root,
    entryFile,
    buildPath,
    buildPathClient,
    buildPathWorkerFile,
    publicPath,
  } = getProjectPaths(appPath, entry);

  await checkLockfileStatus(root);

  console.time(LOG_WORKER_BUILT);

  const {default: fsExtra} = await import('fs-extra');

  const [remixConfig] = await Promise.all([
    getRemixConfig(root, entryFile, publicPath),
    fsExtra.rm(buildPath, {force: true, recursive: true}),
  ]);

  output.info(`\n🏗️  Building in ${process.env.NODE_ENV} mode...`);

  const {build} = await import('@remix-run/dev/dist/compiler/build.js');
  const {logCompileFailure} = await import(
    '@remix-run/dev/dist/compiler/onCompileFailure.js'
  );

  await Promise.all([
    copyPublicFiles(publicPath, buildPathClient),
    build(remixConfig, {
      mode: process.env.NODE_ENV as any,
      sourcemap,
      onCompileFailure: (failure: Error) => {
        logCompileFailure(failure);
        // Stop here and prevent waterfall errors
        throw Error();
      },
    }),
  ]);

  if (process.env.NODE_ENV !== 'development') {
    console.timeEnd(LOG_WORKER_BUILT);
    const {size} = await fsExtra.stat(buildPathWorkerFile);
    const sizeMB = size / (1024 * 1024);

    output.info(
      output.content`   ${colors.dim(
        path.relative(root, buildPathWorkerFile),
      )}  ${output.token.yellow(sizeMB.toFixed(2))} MB\n`,
    );

    if (sizeMB >= 1) {
      output.warn(
        '🚨 Worker bundle exceeds 1 MB! This can delay your worker response.\n',
      );
    }
  }

  if (!disableRouteWarning) {
    const missingRoutes = findMissingRoutes(remixConfig);
    if (missingRoutes.length) {
      output.warn(
        '🚨 Standard Shopify routes missing; run `shopify hydrogen check routes` for more details.',
      );
    }
  }

  // The Remix compiler hangs due to a bug in ESBuild:
  // https://github.com/evanw/esbuild/issues/2727
  // The actual build has already finished so we can kill the process.
  process.exit(0);
}

export async function copyPublicFiles(
  publicPath: string,
  buildPathClient: string,
) {
  const {default: fsExtra} = await import('fs-extra');
  return fsExtra.copy(publicPath, buildPathClient, {
    recursive: true,
    overwrite: true,
  });
}
