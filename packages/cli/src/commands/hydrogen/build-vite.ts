import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {
  outputInfo,
  outputWarn,
  outputContent,
} from '@shopify/cli-kit/node/output';
import {
  fileSize,
  glob,
  readFile,
  removeFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {resolvePath, relativePath, joinPath} from '@shopify/cli-kit/node/path';
import {getPackageManager} from '@shopify/cli-kit/node/node-package-manager';
import colors from '@shopify/cli-kit/node/colors';
import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {checkLockfileStatus} from '../../lib/check-lockfile.js';
import {findMissingRoutes} from '../../lib/missing-routes.js';
import {codegen} from '../../lib/codegen.js';
import {isCI} from '../../lib/is-ci.js';
import {copyDiffBuild, prepareDiffDirectory} from '../../lib/template-diff.js';
import {getViteConfig} from '../../lib/vite-config.js';

const LOG_WORKER_BUILT = '📦 Worker built';
const WORKER_BUILD_SIZE_LIMIT = 5;

export default class Build extends Command {
  static description = 'Builds a Hydrogen storefront for production.';
  static flags = {
    path: commonFlags.path,
    entry: commonFlags.entry,
    sourcemap: Flags.boolean({
      description: 'Generate sourcemaps for the build.',
      env: 'SHOPIFY_HYDROGEN_FLAG_SOURCEMAP',
      allowNo: true,
      default: true,
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

    await runViteBuild({
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
  entry?: string;
  directory?: string;
  useCodegen?: boolean;
  codegenConfigPath?: string;
  sourcemap?: boolean;
  disableRouteWarning?: boolean;
  assetPath?: string;
  bundleStats?: boolean;
  lockfileCheck?: boolean;
};

export async function runViteBuild({
  entry: ssrEntry,
  directory,
  useCodegen = false,
  codegenConfigPath,
  sourcemap = false,
  disableRouteWarning = false,
  lockfileCheck = true,
  assetPath = '/',
}: RunBuildOptions) {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }

  const root = directory ?? process.cwd();

  if (lockfileCheck) {
    await checkLockfileStatus(root, isCI());
  }

  console.time(LOG_WORKER_BUILT);

  outputInfo(`\n🏗️  Building in ${process.env.NODE_ENV} mode...\n`);

  const {viteConfig, remixConfig, clientOutDir, serverOutDir, serverOutFile} =
    await getViteConfig(root);

  // TODO this shouldn't be needed after updating Remix
  process.env.HYDROGEN_ASSET_BASE_URL = assetPath;

  const commonConfig = {
    root,
    mode: process.env.NODE_ENV,
    base: assetPath,
  };

  // Avoid static imports because this file is imported by `deploy` command,
  // which must have a hard dependency on 'vite'.
  const vite = await import('vite');

  // Client build first
  await vite.build({
    ...commonConfig,
    build: {
      emptyOutDir: true,
      copyPublicDir: true,
      // Disable client sourcemaps in production
      sourcemap: process.env.NODE_ENV !== 'production' && sourcemap,
    },
  });

  // Server/SSR build
  await vite.build({
    ...commonConfig,
    build: {
      sourcemap,
      ssr: ssrEntry ?? true,
      emptyOutDir: false,
      copyPublicDir: false,
    },
  });

  await Promise.all([
    removeFile(joinPath(clientOutDir, '.vite')),
    removeFile(joinPath(serverOutDir, '.vite')),
    removeFile(joinPath(serverOutDir, 'assets')),
  ]);

  if (useCodegen) {
    await codegen({
      rootDirectory: root,
      appDirectory: remixConfig.appDirectory,
      configFilePath: codegenConfigPath,
    });
  }

  if (process.env.NODE_ENV !== 'development') {
    console.log('');
    console.timeEnd(LOG_WORKER_BUILT);

    const sizeMB = (await fileSize(serverOutFile)) / (1024 * 1024);
    const formattedSize = colors.yellow(sizeMB.toFixed(2) + ' MB');

    outputInfo(
      outputContent`   ${colors.dim(
        relativePath(root, serverOutFile),
      )}  ${formattedSize}\n`,
    );

    if (sizeMB >= WORKER_BUILD_SIZE_LIMIT) {
      outputWarn(
        `🚨 Smaller worker bundles are faster to deploy and run.${
          viteConfig.build.minify
            ? ''
            : '\n   Minify your bundle by adding `build.minify: true` to vite.config.js.'
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
    await cleanClientSourcemaps(clientOutDir);
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
