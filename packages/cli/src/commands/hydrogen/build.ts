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
  assertOxygenChecks,
  getProjectPaths,
  getRemixConfig,
  handleRemixImportFail,
  RemixConfig,
  type ServerMode,
} from '../../lib/remix-config.js';
import {deprecated, commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {checkLockfileStatus} from '../../lib/check-lockfile.js';
import {findMissingRoutes} from '../../lib/missing-routes.js';
import {createRemixLogger, muteRemixLogs} from '../../lib/log.js';
import {codegen} from '../../lib/codegen.js';
import {
  buildBundleAnalysis,
  getBundleAnalysisSummary,
  hasMetafile,
} from '../../lib/bundle/analyzer.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import {isCI} from '../../lib/is-ci.js';
import {copyDiffBuild, prepareDiffDirectory} from '../../lib/template-diff.js';

const LOG_WORKER_BUILT = '📦 Worker built';
const MAX_WORKER_BUNDLE_SIZE = 10;

export default class Build extends Command {
  static description = 'Builds a Hydrogen storefront for production.';
  static flags = {
    path: commonFlags.path,
    sourcemap: Flags.boolean({
      description: 'Generate sourcemaps for the build.',
      env: 'SHOPIFY_HYDROGEN_FLAG_SOURCEMAP',
      allowNo: true,
      default: true,
    }),
    'bundle-stats': Flags.boolean({
      description: 'Show a bundle size summary after building.',
      default: true,
      allowNo: true,
    }),
    'lockfile-check': Flags.boolean({
      description:
        'Checks that there is exactly 1 valid lockfile in the project.',
      env: 'SHOPIFY_HYDROGEN_FLAG_LOCKFILE_CHECK',
      default: true,
      allowNo: true,
    }),
    'disable-route-warning': Flags.boolean({
      description: 'Disable warning about missing standard routes.',
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_ROUTE_WARNING',
    }),
    codegen: commonFlags.codegen,
    'codegen-config-path': commonFlags.codegenConfigPath,
    diff: commonFlags.diff,

    base: deprecated('--base')(),
    entry: deprecated('--entry')(),
    target: deprecated('--target')(),
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

    await runBuild({
      ...flagsToCamelObject(flags),
      useCodegen: flags.codegen,
      directory,
    });

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
      getRemixConfig(root),
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
      process.exit(1);
    }),
    useCodegen && codegen({...remixConfig, configFilePath: codegenConfigPath}),
  ]);

  if (process.env.NODE_ENV !== 'development') {
    console.timeEnd(LOG_WORKER_BUILT);
    const sizeMB = (await fileSize(buildPathWorkerFile)) / (1024 * 1024);

    if (await hasMetafile(buildPath)) {
      await writeBundleAnalysis(
        buildPath,
        root,
        buildPathWorkerFile,
        sizeMB,
        bundleStats,
        remixConfig,
      );
    } else {
      await writeSimpleBuildStatus(
        root,
        buildPathWorkerFile,
        sizeMB,
        remixConfig,
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

async function writeBundleAnalysis(
  buildPath: string,
  root: string,
  buildPathWorkerFile: string,
  sizeMB: number,
  bundleStats: boolean,
  remixConfig: RemixConfig,
) {
  const bundleAnalysisPath = await buildBundleAnalysis(buildPath);
  outputInfo(
    outputContent`   ${colors.dim(
      relativePath(root, buildPathWorkerFile),
    )}  ${outputToken.link(
      colors.yellow(sizeMB.toFixed(2) + ' MB'),
      bundleAnalysisPath,
    )}\n`,
  );

  if (bundleStats && sizeMB < MAX_WORKER_BUNDLE_SIZE) {
    outputInfo(
      outputContent`${
        (await getBundleAnalysisSummary(buildPathWorkerFile)) || '\n'
      }\n    │\n    └─── ${outputToken.link(
        'Complete analysis: ' + bundleAnalysisPath,
        bundleAnalysisPath,
      )}\n\n`,
    );
  }

  if (sizeMB >= MAX_WORKER_BUNDLE_SIZE) {
    throw new AbortError(
      '🚨 Worker bundle exceeds 10 MB! Oxygen has a maximum worker bundle size of 10 MB.',
      outputContent`See the bundle analysis for a breakdown of what is contributing to the bundle size:\n${outputToken.link(
        bundleAnalysisPath,
        bundleAnalysisPath,
      )}`,
    );
  } else if (sizeMB >= 5) {
    outputWarn(
      `🚨 Worker bundle exceeds 5 MB! This can delay your worker response.${
        remixConfig.serverMinify
          ? ''
          : ' Minify your bundle by adding `serverMinify: true` to remix.config.js.'
      }\n`,
    );
  }
}

async function writeSimpleBuildStatus(
  root: string,
  buildPathWorkerFile: string,
  sizeMB: number,
  remixConfig: RemixConfig,
) {
  outputInfo(
    outputContent`   ${colors.dim(
      relativePath(root, buildPathWorkerFile),
    )}  ${colors.yellow(sizeMB.toFixed(2) + ' MB')}\n`,
  );

  if (sizeMB >= MAX_WORKER_BUNDLE_SIZE) {
    throw new AbortError(
      '🚨 Worker bundle exceeds 10 MB! Oxygen has a maximum worker bundle size of 10 MB.',
    );
  } else if (sizeMB >= 5) {
    outputWarn(
      `🚨 Worker bundle exceeds 5 MB! This can delay your worker response.${
        remixConfig.serverMinify
          ? ''
          : ' Minify your bundle by adding `serverMinify: true` to remix.config.js.'
      }\n`,
    );
  }
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
