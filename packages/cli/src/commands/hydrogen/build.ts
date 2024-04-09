import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {
  outputInfo,
  outputWarn,
  outputContent,
  outputToken,
} from '@shopify/cli-kit/node/output';
import {
  fileSize,
  copyFile,
  rmdir,
  glob,
  fileExists,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {resolvePath, relativePath, joinPath} from '@shopify/cli-kit/node/path';
import {getPackageManager} from '@shopify/cli-kit/node/node-package-manager';
import colors from '@shopify/cli-kit/node/colors';
import {
  type RemixConfig,
  assertOxygenChecks,
  getProjectPaths,
  getRemixConfig,
  handleRemixImportFail,
  type ServerMode,
} from '../../lib/remix-config.js';
import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {checkLockfileStatus} from '../../lib/check-lockfile.js';
import {findMissingRoutes} from '../../lib/missing-routes.js';
import {createRemixLogger, muteRemixLogs} from '../../lib/log.js';
import {codegen} from '../../lib/codegen.js';
import {
  buildBundleAnalysis,
  getBundleAnalysisSummary,
} from '../../lib/bundle/analyzer.js';
import {isCI} from '../../lib/is-ci.js';
import {copyDiffBuild, prepareDiffDirectory} from '../../lib/template-diff.js';
import {hasViteConfig} from '../../lib/vite-config.js';

const LOG_WORKER_BUILT = '📦 Worker built';
const WORKER_BUILD_SIZE_LIMIT = 5;

export default class Build extends Command {
  static descriptionWithMarkdown = `Builds a Hydrogen storefront for production. The client and app worker files are compiled to a \`/dist\` folder in your Hydrogen project directory.`

  static description = 'Builds a Hydrogen storefront for production.';
  static flags = {
    ...commonFlags.path,
    ...commonFlags.sourcemap,
    'bundle-stats': Flags.boolean({
      description:
        'Show a bundle size summary after building. Defaults to true, use `--no-bundle-stats` to disable.',
      default: true,
      allowNo: true,
    }),
    ...commonFlags.lockfileCheck,
    ...commonFlags.disableRouteWarning,
    ...commonFlags.codegen,
    ...commonFlags.diff,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Build);
    const originalDirectory = flags.path
      ? resolvePath(flags.path)
      : process.cwd();
    let directory = originalDirectory;

    if (flags.diff) {
      directory = await prepareDiffDirectory(originalDirectory, false);
    }

    const buildParams = {
      ...flagsToCamelObject(flags),
      useCodegen: flags.codegen,
      directory,
    };

    if (await hasViteConfig(directory ?? process.cwd())) {
      const {runViteBuild} = await import('./build-vite.js');
      await runViteBuild(buildParams);
    } else {
      await runBuild(buildParams);
    }

    if (flags.diff) {
      await copyDiffBuild(directory, originalDirectory);
    }

    // The Remix compiler hangs due to a bug in ESBuild:
    // https://github.com/evanw/esbuild/issues/2727
    // The actual build has already finished so we can kill the process.
    process.exit(0);
  }
}

type RunBuildOptions = {
  directory?: string;
  useCodegen?: boolean;
  codegenConfigPath?: string;
  sourcemap?: boolean;
  disableRouteWarning?: boolean;
  assetPath?: string;
  bundleStats?: boolean;
  lockfileCheck?: boolean;
};

export async function runBuild({
  directory,
  useCodegen = false,
  codegenConfigPath,
  sourcemap = false,
  disableRouteWarning = false,
  bundleStats = true,
  lockfileCheck = true,
  assetPath,
}: RunBuildOptions) {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }
  if (assetPath) {
    process.env.HYDROGEN_ASSET_BASE_URL = assetPath;
  }

  const {root, buildPath, buildPathClient, buildPathWorkerFile, publicPath} =
    getProjectPaths(directory);

  if (lockfileCheck) {
    await checkLockfileStatus(root, isCI());
  }

  await muteRemixLogs();

  console.time(LOG_WORKER_BUILT);

  outputInfo(`\n🏗️  Building in ${process.env.NODE_ENV} mode...`);

  const [remixConfig, [{build}, {logThrown}, {createFileWatchCache}]] =
    await Promise.all([
      getRemixConfig(root) as Promise<RemixConfig>,
      Promise.all([
        import('@remix-run/dev/dist/compiler/build.js'),
        import('@remix-run/dev/dist/compiler/utils/log.js'),
        import('@remix-run/dev/dist/compiler/fileWatchCache.js'),
      ]).catch(handleRemixImportFail),
      rmdir(buildPath, {force: true}),
    ]);

  assertOxygenChecks(remixConfig);

  await Promise.all([
    copyPublicFiles(publicPath, buildPathClient),
    build({
      config: remixConfig,
      options: {
        mode: process.env.NODE_ENV as ServerMode,
        sourcemap,
      },
      logger: createRemixLogger(),
      fileWatchCache: createFileWatchCache(),
    }).catch((thrown) => {
      logThrown(thrown);
      if (process.env.SHOPIFY_UNIT_TEST) {
        throw thrown;
      } else {
        process.exit(1);
      }
    }),
    useCodegen && codegen({...remixConfig, configFilePath: codegenConfigPath}),
  ]);

  if (process.env.NODE_ENV !== 'development') {
    console.timeEnd(LOG_WORKER_BUILT);

    const bundleAnalysisPath = await buildBundleAnalysis(buildPath);

    const sizeMB = (await fileSize(buildPathWorkerFile)) / (1024 * 1024);
    const formattedSize = colors.yellow(sizeMB.toFixed(2) + ' MB');

    outputInfo(
      outputContent`   ${colors.dim(
        relativePath(root, buildPathWorkerFile),
      )}  ${
        bundleAnalysisPath
          ? outputToken.link(formattedSize, bundleAnalysisPath)
          : formattedSize
      }\n`,
    );

    if (bundleStats && bundleAnalysisPath) {
      outputInfo(
        outputContent`${
          (await getBundleAnalysisSummary(buildPathWorkerFile)) || '\n'
        }\n    │\n    └─── ${outputToken.link(
          'Complete analysis: ' + bundleAnalysisPath,
          bundleAnalysisPath,
        )}\n\n`,
      );
    }

    if (sizeMB >= WORKER_BUILD_SIZE_LIMIT) {
      outputWarn(
        `🚨 Smaller worker bundles are faster to deploy and run.${
          remixConfig.serverMinify
            ? ''
            : '\n   Minify your bundle by adding `serverMinify: true` to remix.config.js.'
        }\n   Learn more about optimizing your worker bundle file: https://h2o.fyi/debugging/bundle-size\n`,
      );
    }
  }

  if (!disableRouteWarning) {
    const missingRoutes = findMissingRoutes(remixConfig);
    if (missingRoutes.length) {
      const packageManager = await getPackageManager(root);
      const exec = packageManager === 'npm' ? 'npx' : packageManager;

      outputWarn(
        `Heads up: Shopify stores have a number of standard routes that aren’t set up yet.\n` +
          `Some functionality and backlinks might not work as expected until these are created or redirects are set up.\n` +
          `This build is missing ${missingRoutes.length} route${
            missingRoutes.length > 1 ? 's' : ''
          }. For more details, run \`${exec} shopify hydrogen check routes\`.\n`,
      );
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    await cleanClientSourcemaps(buildPathClient);
  }
}

async function cleanClientSourcemaps(buildPathClient: string) {
  const bundleFiles = await glob(joinPath(buildPathClient, '**/*.js'));

  await Promise.all(
    bundleFiles.map(async (filePath) => {
      const file = await readFile(filePath);
      return await writeFile(
        filePath,
        file.replace(/\/\/# sourceMappingURL=.+\.js\.map$/gm, ''),
      );
    }),
  );
}

export async function copyPublicFiles(
  publicPath: string,
  buildPathClient: string,
) {
  if (!(await fileExists(publicPath))) {
    return;
  }

  return copyFile(publicPath, buildPathClient);
}
