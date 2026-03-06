import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {resolvePath, joinPath} from '@shopify/cli-kit/node/path';
import {
  outputWarn,
  collectLog,
  outputInfo,
  outputContent,
  outputToken,
} from '@shopify/cli-kit/node/output';
import {fileSize, removeFile} from '@shopify/cli-kit/node/fs';
import {getPackageManager} from '@shopify/cli-kit/node/node-package-manager';
import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {
  getViteConfig,
  isViteProject,
  REMIX_COMPILER_ERROR_MESSAGE,
} from '../../lib/vite-config.js';
import {checkLockfileStatus} from '../../lib/check-lockfile.js';
import {
  findMissingRoutes,
  findReservedRoutes,
  warnReservedRoutes,
} from '../../lib/route-validator.js';
import {hydrogenBundleAnalyzer} from '../../lib/bundle/vite-plugin.js';
import {
  BUNDLE_ANALYZER_HTML_FILE,
  getBundleAnalysisSummary,
} from '../../lib/bundle/analyzer.js';
import {codegen, spawnCodegenProcess} from '../../lib/codegen.js';
import {isCI} from '../../lib/is-ci.js';
import {importVite} from '../../lib/import-utils.js';
import {deferPromise, type DeferredPromise} from '../../lib/defer.js';
import {setupResourceCleanup} from '../../lib/resource-cleanup.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import {spawnSync} from 'node:child_process';
import {readdir} from 'node:fs/promises';

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
    watch: Flags.boolean({
      description:
        'Watches for changes and rebuilds the project writing output to disk.',
      env: 'SHOPIFY_HYDROGEN_FLAG_WATCH',
    }),
    'bundle-stats': Flags.boolean({
      description:
        'Show a bundle size summary after building. Defaults to true, use `--no-bundle-stats` to disable.',
      allowNo: true,
    }),
    'force-client-sourcemap': Flags.boolean({
      description:
        'Client sourcemapping is avoided by default because it makes backend code visible in the browser. Use this flag to force enabling it.',
      env: 'SHOPIFY_HYDROGEN_FLAG_FORCE_CLIENT_SOURCEMAP',
    }),
    'native-build': Flags.boolean({
      description:
        'Use `react-router build` instead of the Hydrogen Vite build pipeline.',
      env: 'SHOPIFY_HYDROGEN_FLAG_NATIVE_BUILD',
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Build);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    const buildParams = {
      ...flagsToCamelObject(flags),
      useCodegen: flags.codegen,
      directory,
    };

    const isVite = await isViteProject(directory);
    if (!isVite) {
      throw new AbortError(REMIX_COMPILER_ERROR_MESSAGE);
    }

    const result = await runBuild(buildParams);

    if (buildParams.watch) {
      if (result?.close) {
        setupResourceCleanup(async () => {
          await result?.close();
        });
      }
    } else {
      // The Remix compiler hangs due to a bug in ESBuild:
      // https://github.com/evanw/esbuild/issues/2727
      // The actual build has already finished so we can kill the process.
      process.exit(0);
    }
  }
}

const WORKER_BUILD_SIZE_LIMIT = 5;

type RunBuildOptions = {
  entry?: string;
  directory?: string;
  useCodegen?: boolean;
  codegenConfigPath?: string;
  sourcemap?: boolean;
  forceClientSourcemap?: boolean;
  disableRouteWarning?: boolean;
  assetPath?: string;
  bundleStats?: boolean;
  lockfileCheck?: boolean;
  watch?: boolean;
  nativeBuild?: boolean;
  onServerBuildStart?: () => void | Promise<void>;
  onServerBuildFinish?: () => void | Promise<void>;
};

export async function runBuild({
  entry: ssrEntry,
  directory,
  useCodegen = false,
  codegenConfigPath,
  sourcemap = true,
  forceClientSourcemap,
  disableRouteWarning = false,
  lockfileCheck = true,
  assetPath,
  bundleStats = !isCI(),
  watch = false,
  nativeBuild = false,
  onServerBuildStart,
  onServerBuildFinish,
}: RunBuildOptions) {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }

  assetPath = assetPath ?? process.env.HYDROGEN_ASSET_BASE_URL ?? '/';

  const root = directory ?? process.cwd();

  if (lockfileCheck) {
    await checkLockfileStatus(root, isCI());
  }

  const {
    userViteConfig,
    remixConfig,
    clientOutDir,
    serverOutDir,
    serverOutFile,
  } = await getViteConfig(root, ssrEntry);

  const serverMinify = userViteConfig.build?.minify ?? true;

  if (nativeBuild && watch) {
    throw new AbortError(
      'The `--watch` flag is not supported with `--native-build`.',
      'Use `shopify hydrogen dev` for automatic rebuilds.',
    );
  }

  if (nativeBuild && ssrEntry) {
    throw new AbortError(
      'The `--entry` flag is not supported with `--native-build`.',
      'Use the React Router config file to customize your server entrypoint.',
    );
  }

  if (nativeBuild) {
    await runNativeBuild({
      root,
      sourcemap,
      forceClientSourcemap,
      mode: process.env.NODE_ENV,
      onServerBuildStart,
      onServerBuildFinish,
    });
  }

  const vite = nativeBuild ? undefined : await importVite(root);

  let clientBuild: {close: () => Promise<void>} | undefined;
  let serverBuild: {close: () => Promise<void>} | undefined;
  let clientBuildStatus: DeferredPromise | undefined;
  let serverBuildStatus: DeferredPromise | undefined;

  if (vite) {
    const customLogger = vite.createLogger(watch ? 'warn' : undefined);
    if (process.env.SHOPIFY_UNIT_TEST) {
      // Make logs from Vite visible in tests
      customLogger.info = (msg) => collectLog('info', msg);
      customLogger.warn = (msg) => collectLog('warn', msg);
      customLogger.error = (msg) => collectLog('error', msg);
    }

    const commonConfig = {
      root,
      mode: process.env.NODE_ENV,
      base: assetPath,
      customLogger,
    };

    // Client build first
    const maybeClientBuild = await vite.build({
      ...commonConfig,
      build: {
        emptyOutDir: true,
        copyPublicDir: true,
        // Disable client sourcemaps in production by default
        sourcemap:
          forceClientSourcemap ??
          (process.env.NODE_ENV !== 'production' && sourcemap),
        watch: watch ? {} : null,
      },
      server: {
        watch: watch ? {} : null,
      },
      plugins: [
        {
          name: 'hydrogen:cli:client',
          buildStart() {
            clientBuildStatus?.resolve();
            clientBuildStatus = deferPromise();
          },
          buildEnd(error) {
            if (error) clientBuildStatus?.reject(error);
          },
          writeBundle() {
            clientBuildStatus?.resolve();
          },
          closeWatcher() {
            // End build process if watcher is closed
            this.error(
              new Error('Process exited before client build finished.'),
            );
          },
        },
      ],
    });

    if ('close' in maybeClientBuild) {
      clientBuild = maybeClientBuild;
    }

    console.log('');

    // Server/SSR build
    const maybeServerBuild = await vite.build({
      ...commonConfig,
      build: {
        sourcemap,
        ssr: ssrEntry ?? true,
        emptyOutDir: false,
        copyPublicDir: false,
        minify: serverMinify,
        // Ensure the server rebuild start after the client one
        watch: watch ? {buildDelay: 100} : null,
      },
      server: {
        watch: watch ? {} : null,
      },
      plugins: [
        {
          name: 'hydrogen:cli:server',
          async buildStart() {
            // Wait for the client build to finish in watch mode
            // before starting the server build to access the
            // Remix manifest from file disk.
            await clientBuildStatus?.promise;

            // Keep track of server builds to wait for them to finish
            // before cleaning up resources in watch mode. Otherwise,
            // it might complain about missing files and loop infinitely.
            serverBuildStatus?.resolve();
            serverBuildStatus = deferPromise();
            await onServerBuildStart?.();
          },
          async writeBundle() {
            if (serverBuildStatus?.state !== 'rejected') {
              await onServerBuildFinish?.();
            }

            serverBuildStatus?.resolve();
          },
          closeWatcher() {
            // End build process if watcher is closed
            this.error(
              new Error('Process exited before server build finished.'),
            );
          },
        },
        ...(bundleStats
          ? [
              hydrogenBundleAnalyzer({
                minify: serverMinify
                  ? (code, filepath) =>
                      vite
                        .transformWithEsbuild(code, filepath, {
                          minify: true,
                          minifyWhitespace: true,
                          minifySyntax: true,
                          minifyIdentifiers: true,
                          sourcemap: false,
                          treeShaking: false, // Tree-shaking would drop most exports in routes
                          legalComments: 'none',
                          target: 'esnext',
                        })
                        .then((result) => result.code)
                  : undefined,
              }),
            ]
          : []),
      ],
    });

    if ('close' in maybeServerBuild) {
      serverBuild = maybeServerBuild;
    }
  }

  if (!watch) {
    await Promise.all([
      removeFile(joinPath(clientOutDir, '.vite')),
      removeFile(joinPath(serverOutDir, '.vite')),
      removeFile(joinPath(serverOutDir, 'assets')),
    ]);

    if (nativeBuild) {
      await cleanupNativeBuildArtifacts({
        clientOutDir,
        serverOutDir,
        clientSourcemap:
          forceClientSourcemap ??
          (process.env.NODE_ENV !== 'production' && sourcemap),
      });
    }
  }

  const codegenOptions = {
    rootDirectory: root,
    appDirectory: remixConfig.appDirectory,
    configFilePath: codegenConfigPath,
  };

  const codegenProcess = useCodegen
    ? watch
      ? spawnCodegenProcess(codegenOptions)
      : await codegen(codegenOptions).then(() => undefined)
    : undefined;

  if (!watch && process.env.NODE_ENV !== 'development') {
    if (bundleStats && !nativeBuild) {
      const bundleAnalysisPath =
        'file://' + joinPath(serverOutDir, BUNDLE_ANALYZER_HTML_FILE);

      outputInfo(
        outputContent`${
          (await getBundleAnalysisSummary(serverOutDir)) || '\n'
        }\n    │\n    └─── ${outputToken.link(
          'Complete analysis: ' + bundleAnalysisPath,
          bundleAnalysisPath,
        )}\n\n`,
      );
    }

    if (bundleStats && nativeBuild) {
      outputInfo(
        'Bundle stats are not currently available with `--native-build`.',
      );
    }

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

  if (!watch && !disableRouteWarning) {
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

  if (!watch && !disableRouteWarning) {
    warnReservedRoutes(findReservedRoutes(remixConfig));
  }

  return {
    async close() {
      codegenProcess?.removeAllListeners('close');
      codegenProcess?.kill('SIGINT');

      const promises: Array<Promise<void>> = [];
      if (clientBuild) promises.push(clientBuild.close());
      if (serverBuild) promises.push(serverBuild.close());

      await Promise.allSettled(promises);

      if (
        clientBuildStatus?.state === 'pending' ||
        serverBuildStatus?.state === 'pending'
      ) {
        clientBuildStatus?.promise.catch(() => {});
        clientBuildStatus?.reject();
        serverBuildStatus?.promise.catch(() => {});
        serverBuildStatus?.reject();

        // Give time for Rollup to stop builds before removing files
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    },
  };
}

type NativeBuildOptions = {
  root: string;
  mode: string;
  sourcemap: boolean;
  forceClientSourcemap?: boolean;
  onServerBuildStart?: () => void | Promise<void>;
  onServerBuildFinish?: () => void | Promise<void>;
};

async function runNativeBuild({
  root,
  mode,
  sourcemap,
  forceClientSourcemap,
  onServerBuildStart,
  onServerBuildFinish,
}: NativeBuildOptions) {
  const packageManager = await getPackageManager(root);
  const clientSourcemap =
    forceClientSourcemap ??
    (process.env.NODE_ENV !== 'production' && sourcemap);

  const buildArgs = [
    'react-router',
    'build',
    '--mode',
    mode,
    '--sourcemapServer',
    String(sourcemap),
    '--sourcemapClient',
    String(clientSourcemap),
  ];

  await onServerBuildStart?.();

  const result = spawnSync('npx', buildArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error || result.status !== 0) {
    throw new AbortError(
      'Native build failed while running `react-router build`.',
      'Fix the build error shown above and try again.',
    );
  }

  await onServerBuildFinish?.();
}

async function cleanupNativeBuildArtifacts({
  clientOutDir,
  serverOutDir,
  clientSourcemap,
}: {
  clientOutDir: string;
  serverOutDir: string;
  clientSourcemap: boolean;
}) {
  const serverFiles = await readdir(serverOutDir).catch(() => []);

  const cleanupPromises = serverFiles
    .filter(
      (filename) =>
        filename === 'metafile.server.json' ||
        (filename.startsWith('server-') && filename.endsWith('.html')),
    )
    .map((filename) => removeFile(joinPath(serverOutDir, filename)));

  if (!clientSourcemap) {
    const clientAssetDir = joinPath(clientOutDir, 'assets');
    const clientAssetFiles = await readdir(clientAssetDir).catch(() => []);

    cleanupPromises.push(
      ...clientAssetFiles
        .filter((filename) => filename.endsWith('.map'))
        .map((filename) => removeFile(joinPath(clientAssetDir, filename))),
    );
  }

  await Promise.allSettled(cleanupPromises);
}
