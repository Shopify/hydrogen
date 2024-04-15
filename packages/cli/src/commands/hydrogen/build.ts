import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {resolvePath, joinPath} from '@shopify/cli-kit/node/path';
import {outputWarn, collectLog} from '@shopify/cli-kit/node/output';
import {fileSize, removeFile} from '@shopify/cli-kit/node/fs';
import {getPackageManager} from '@shopify/cli-kit/node/node-package-manager';
import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {copyDiffBuild, prepareDiffDirectory} from '../../lib/template-diff.js';
import {hasViteConfig, getViteConfig} from '../../lib/vite-config.js';
import {checkLockfileStatus} from '../../lib/check-lockfile.js';
import {findMissingRoutes} from '../../lib/missing-routes.js';
import {codegen} from '../../lib/codegen.js';
import {isCI} from '../../lib/is-ci.js';

export default class Build extends Command {
  static descriptionWithMarkdown = `Builds a Hydrogen storefront for production. The client and app worker files are compiled to a \`/dist\` folder in your Hydrogen project directory.`;

  static description = 'Builds a Hydrogen storefront for production.';
  static flags = {
    ...commonFlags.path,
    ...commonFlags.entry,
    ...commonFlags.sourcemap,
    ...commonFlags.lockfileCheck,
    ...commonFlags.disableRouteWarning,
    ...commonFlags.codegen,
    ...commonFlags.diff,

    // For the classic compiler:
    'bundle-stats': Flags.boolean({
      description:
        '[Classic Remix Compiler] Show a bundle size summary after building. Defaults to true, use `--no-bundle-stats` to disable.',
      default: true,
      allowNo: true,
    }),
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

    if (await hasViteConfig(directory)) {
      await runBuild(buildParams);
    } else {
      const {runClassicCompilerBuild} = await import(
        '../../lib/classic-compiler/build.js'
      );
      await runClassicCompilerBuild(buildParams);
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

const WORKER_BUILD_SIZE_LIMIT = 5;

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

export async function runBuild({
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

  const [
    vite,
    {userViteConfig, remixConfig, clientOutDir, serverOutDir, serverOutFile},
  ] = await Promise.all([
    // Avoid static imports because this file is imported by `deploy` command,
    // which must have a hard dependency on 'vite'.
    import('vite'),
    getViteConfig(root, ssrEntry),
  ]);

  const customLogger = vite.createLogger();
  if (process.env.SHOPIFY_UNIT_TEST) {
    // Make logs from Vite visible in tests
    customLogger.info = (msg) => collectLog('info', msg);
    customLogger.warn = (msg) => collectLog('warn', msg);
    customLogger.error = (msg) => collectLog('error', msg);
  }

  const serverMinify = userViteConfig.build?.minify ?? true;
  const commonConfig = {
    root,
    mode: process.env.NODE_ENV,
    base: assetPath,
    customLogger,
  };

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

  console.log('');

  // Server/SSR build
  await vite.build({
    ...commonConfig,
    build: {
      sourcemap,
      ssr: ssrEntry ?? true,
      emptyOutDir: false,
      copyPublicDir: false,
      minify: serverMinify,
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
    const sizeMB = (await fileSize(serverOutFile)) / (1024 * 1024);

    if (sizeMB >= WORKER_BUILD_SIZE_LIMIT) {
      outputWarn(
        `🚨 Smaller worker bundles are faster to deploy and run.${
          serverMinify
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
}
