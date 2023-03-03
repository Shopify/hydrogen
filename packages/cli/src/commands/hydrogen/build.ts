import path from 'path';
import {output, file} from '@shopify/cli-kit';
import colors from '@shopify/cli-kit/node/colors';
import {getProjectPaths, getRemixConfig} from '../../utils/config.js';
import {
  deprecated,
  commonFlags,
  flagsToCamelObject,
} from '../../utils/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import Flags from '@oclif/core/lib/flags.js';
import {checkLockfileStatus} from '../../utils/check-lockfile.js';
import {findMissingRoutes} from '../../utils/missing-routes.js';
import {getPackageManager} from '@shopify/cli-kit/node/node-package-manager';

const LOG_WORKER_BUILT = '📦 Worker built';

export default class Build extends Command {
  static description = 'Builds a Hydrogen storefront for production.';
  static flags = {
    path: commonFlags.path,
    sourcemap: Flags.boolean({
      description: 'Generate sourcemaps for the build.',
      env: 'SHOPIFY_HYDROGEN_FLAG_SOURCEMAP',
      default: true,
    }),
    ['disable-route-warning']: Flags.boolean({
      description: 'Disable warning about missing standard routes.',
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_ROUTE_WARNING',
    }),
    base: deprecated('--base')(),
    entry: deprecated('--entry')(),
    target: deprecated('--target')(),
  };

  async run(): Promise<void> {
    // @ts-ignore
    const {flags} = await this.parse(Build);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    await runBuild({...flagsToCamelObject(flags), path: directory});
  }
}

export async function runBuild({
  path: appPath,
  sourcemap = true,
  disableRouteWarning = false,
}: {
  path?: string;
  sourcemap?: boolean;
  disableRouteWarning?: boolean;
}) {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }

  const {root, buildPath, buildPathClient, buildPathWorkerFile, publicPath} =
    getProjectPaths(appPath);

  await checkLockfileStatus(root);

  console.time(LOG_WORKER_BUILT);

  const [remixConfig] = await Promise.all([
    getRemixConfig(root),
    file.rmdir(buildPath, {force: true}),
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
    const sizeMB = (await file.size(buildPathWorkerFile)) / (1024 * 1024);

    output.info(
      output.content`   ${colors.dim(
        path.relative(root, buildPathWorkerFile),
      )}  ${output.token.yellow(sizeMB.toFixed(2))} MB\n`,
    );

    if (sizeMB >= 1) {
      output.warn(
        `🚨 Worker bundle exceeds 1 MB! This can delay your worker response.${
          // @ts-ignore
          remixConfig.serverMinify
            ? ''
            : ' Minify your bundle by adding `serverMinify: true` to remix.config.js.'
        }\n`,
      );
    }
  }

  if (!disableRouteWarning) {
    const missingRoutes = findMissingRoutes(remixConfig);
    if (missingRoutes.length) {
      const packageManager = await getPackageManager(root);
      const exec = packageManager === 'npm' ? 'npx' : packageManager;

      output.warn(
        `Heads up: Shopify stores have a number of standard routes that aren’t set up yet.\n` +
          `Some functionality and backlinks might not work as expected until these are created or redirects are set up.\n` +
          `This build is missing ${missingRoutes.length} route${
            missingRoutes.length > 1 ? 's' : ''
          }. For more details, run \`${exec} shopify hydrogen check routes\`.\n`,
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
  return file.copy(publicPath, buildPathClient);
}
