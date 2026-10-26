import {writeJsonResult, isJsonOutput} from '../../lib/json-output.js';
import {
  flushStdout,
  unstyled,
  outputWarn,
  collectLog,
  outputInfo,
  outputContent,
  outputToken,
} from '@shopify/cli-kit/node/output';
import {emitCommandEvent} from '@shopify/cli-kit/node/command-events';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {
  buildJsonOutputSchema,
  buildCommandOutputSchema,
  type BuildResult,
  type BuildWatchRecord,
} from '../../lib/build-tooling/types.js';
import {runWatchCommand, writeWatchRecord} from '../../lib/watch.js';
import {Flags} from '@oclif/core';
import Command from '../../lib/hydrogen-command.js';
import {resolvePath, joinPath} from '@shopify/cli-kit/node/path';
import {fileSize, removeFile, writeFile} from '@shopify/cli-kit/node/fs';
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
import {realpath} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';

export default class Build extends Command {
  static get jsonOutputSchema(): typeof buildCommandOutputSchema {
    return buildCommandOutputSchema;
  }

  static descriptionWithMarkdown = `Builds a Hydrogen storefront for production. The client and app worker files are compiled to a \`/dist\` folder in your Hydrogen project directory. With \`--json --watch\`, emits JSONL lifecycle and build records to stdout and diagnostics to stderr until stopped.`;

  static description = this.descriptionForHelp();
  static flags = {
    ...jsonFlag,
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

    if (flags.json && flags.watch) {
      await runWatchCommand((signal) =>
        runBuildWatch(buildParams, signal, (record) =>
          writeWatchRecord(buildCommandOutputSchema, record),
        ),
      );
      return;
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
      writeJsonResult(buildJsonOutputSchema, result.result, flags.json);
      await flushStdout();
      process.exit(0);
    }
  }
}

const WORKER_BUILD_SIZE_LIMIT = 5;

type RunBuildOptions = {
  json?: boolean;
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
  signal?: AbortSignal;
  registerCleanup?: (close: () => Promise<unknown>) => void;
  onServerBuildStart?: () => void | Promise<void>;
  onServerBuildFinish?: (
    cycle: number,
    result: BuildResult,
  ) => void | Promise<void>;
  onBuildStart?: (cycle: number) => void;
  onBuildFinish?: (cycle: number, result: BuildResult) => void;
  onBuildError?: (cycle: number, error: Error) => void;
};

export async function runBuildWatch(
  options: RunBuildOptions,
  signal: AbortSignal,
  onRecord: (record: BuildWatchRecord) => void,
) {
  onRecord({
    type: 'watch-started',
    directory: resolvePath(options.directory ?? process.cwd()),
  });
  const build = await runBuild({
    ...options,
    json: true,
    watch: true,
    onBuildStart: (cycle) => onRecord({type: 'build-started', cycle}),
    onBuildFinish: (cycle, result) =>
      onRecord({type: 'build-completed', cycle, ...result}),
    onBuildError: (cycle, error) =>
      onRecord({type: 'build-failed', cycle, error: {message: error.message}}),
  });
  try {
    if (!signal.aborted)
      await new Promise<void>((resolve) =>
        signal.addEventListener('abort', () => resolve(), {once: true}),
      );
  } finally {
    await build.close();
  }
  onRecord({type: 'watch-stopped'});
}

export async function runBuild({
  json = isJsonOutput(),
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
  signal,
  registerCleanup,
  onServerBuildStart,
  onServerBuildFinish,
  onBuildStart,
  onBuildFinish,
  onBuildError,
}: RunBuildOptions) {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }

  assetPath = assetPath ?? process.env.HYDROGEN_ASSET_BASE_URL ?? '/';

  // Vite resolves source files through symlinks. Use the same root for both
  // builds so Remix can match its client manifest to the server entry points.
  const root = await realpath(directory ?? process.cwd());

  if (lockfileCheck) {
    await checkLockfileStatus(root, isCI());
  }

  const [
    vite,
    {userViteConfig, remixConfig, clientOutDir, serverOutDir, serverOutFile},
  ] = await Promise.all([
    // Avoid static imports because this file is imported by `deploy` command,
    // which must have a hard dependency on 'vite'.
    importVite(root),
    getViteConfig(root, ssrEntry),
  ]);

  const customLogger = vite.createLogger(watch ? 'warn' : undefined);
  const result: BuildResult = {
    directory: resolvePath(root),
    clientDirectory: resolvePath(root, clientOutDir),
    serverDirectory: resolvePath(root, serverOutDir),
    serverPath: resolvePath(root, serverOutFile),
  };
  let cycle = 0;
  let activeCycle = false;
  let closing = false;
  const startCycle = () => {
    if (!activeCycle && !closing) {
      activeCycle = true;
      onBuildStart?.(++cycle);
    }
  };
  const failCycle = (error: Error) => {
    if (activeCycle && !closing) {
      activeCycle = false;
      onBuildError?.(cycle, error);
    }
  };
  if (process.env.SHOPIFY_UNIT_TEST) {
    // Make logs from Vite visible in tests
    customLogger.info = (msg) => collectLog('info', msg);
    customLogger.warn = (msg) => collectLog('warn', msg);
    customLogger.error = (msg) => collectLog('error', msg);
  }

  if (json) {
    customLogger.info = (message) =>
      emitCommandEvent({
        type: 'diagnostic',
        level: 'info',
        message: unstyled(message),
      });
    customLogger.warn = (message) =>
      emitCommandEvent({
        type: 'diagnostic',
        level: 'warning',
        message: unstyled(message),
      });
    customLogger.warnOnce = customLogger.warn;
    customLogger.error = (message) =>
      emitCommandEvent({
        type: 'diagnostic',
        level: 'error',
        message: unstyled(message),
      });
  }

  const serverMinify = userViteConfig.build?.minify ?? true;
  const commonConfig = {
    root,
    mode: process.env.NODE_ENV,
    base: assetPath,
    customLogger,
    // Vite’s reporter writes TTY progress directly to stdout at info level.
    ...(json ? {logLevel: 'warn' as const} : {}),
  };

  let clientBuildStatus: DeferredPromise;
  let clientBuildNumber = 0;
  let serverWaitingForClient = false;
  let lastServerClientBuild = -1;
  let duplicateServerBuild = false;
  const serverChanges = new Set<string>();
  // A shared trigger also covers plugin watch files outside the client module graph.
  // JSON cycles need a matching server result after every successful client build.
  // Keep text and preview watch behavior unchanged here.
  // Resolve its directory so watcher subscriptions match filesystem event paths.
  const clientBuildTrigger =
    json && watch
      ? joinPath(
          await realpath(tmpdir()),
          `hydrogen-client-build-${randomUUID()}`,
        )
      : undefined;
  if (clientBuildTrigger) await writeFile(clientBuildTrigger, '0');
  let serverBuildStatus: DeferredPromise;
  let codegenProcess: ReturnType<typeof spawnCodegenProcess> | undefined;
  const buildWatchers = new Set<{close: () => Promise<void>}>();
  let pendingCleanup = Promise.resolve();
  const close = () => {
    closing = true;
    codegenProcess?.removeAllListeners('close');
    codegenProcess?.kill('SIGINT');
    codegenProcess = undefined;

    const pendingBuild =
      clientBuildStatus?.state === 'pending' ||
      serverBuildStatus?.state === 'pending';
    if (pendingBuild) {
      clientBuildStatus?.promise.catch(() => {});
      clientBuildStatus?.reject();
      serverBuildStatus?.promise.catch(() => {});
      serverBuildStatus?.reject();
    }

    const watchers = [...buildWatchers];
    buildWatchers.clear();
    pendingCleanup = Promise.allSettled([
      pendingCleanup,
      ...watchers.map((watcher) =>
        Promise.resolve().then(() => watcher.close()),
      ),
    ]).then(async () => {
      if (pendingBuild) {
        // Give Rollup time to stop builds before removing files.
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (clientBuildTrigger) await removeFile(clientBuildTrigger);
    });
    return pendingCleanup;
  };

  // Client build first
  const clientBuild = await vite
    .build({
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
            startCycle();
            clientBuildStatus?.resolve();
            clientBuildStatus = deferPromise();
            // A client failure can precede the server starting to await this build.
            clientBuildStatus.promise.catch(() => {});
          },
          buildEnd(error) {
            if (error) {
              clientBuildStatus.reject(error);
              failCycle(error);
            }
          },
          async writeBundle() {
            try {
              ++clientBuildNumber;
              if (clientBuildTrigger && !serverWaitingForClient && !closing) {
                await writeFile(clientBuildTrigger, String(clientBuildNumber));
              }
              clientBuildStatus.resolve();
            } catch (error) {
              clientBuildStatus.reject(error);
              failCycle(
                error instanceof Error ? error : new Error(String(error)),
              );
              throw error;
            }
          },
          closeWatcher() {
            if (closing) return;
            // End build process if watcher is closed
            this.error(
              new Error('Process exited before client build finished.'),
            );
          },
        },
      ],
    })
    .catch(async (error: unknown) => {
      if (clientBuildTrigger) await removeFile(clientBuildTrigger);
      throw error;
    });

  if ('close' in clientBuild) {
    buildWatchers.add(clientBuild);
    registerCleanup?.(close);
  }
  signal?.throwIfAborted();

  if (!json) console.log('');

  // Server/SSR build
  const serverBuild = await vite
    .build({
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
          watchChange(id) {
            serverChanges.add(id);
          },
          async buildStart() {
            if (clientBuildTrigger) this.addWatchFile(clientBuildTrigger);
            const changedPaths = new Set(serverChanges);
            serverChanges.clear();
            duplicateServerBuild = false;
            // Wait for the client build to finish in watch mode
            // before starting the server build to access the
            // Remix manifest from file disk.
            serverWaitingForClient = true;
            try {
              await clientBuildStatus.promise;
            } finally {
              serverWaitingForClient = false;
            }
            duplicateServerBuild =
              clientBuildTrigger !== undefined &&
              changedPaths.size === 1 &&
              changedPaths.has(clientBuildTrigger) &&
              clientBuildNumber === lastServerClientBuild;
            lastServerClientBuild = clientBuildNumber;
            if (duplicateServerBuild) return;
            startCycle();

            // Keep track of server builds to wait for them to finish
            // before cleaning up resources in watch mode. Otherwise,
            // it might complain about missing files and loop infinitely.
            serverBuildStatus?.resolve();
            serverBuildStatus = deferPromise();
            serverBuildStatus.promise.catch(() => {});
            await onServerBuildStart?.();
          },
          buildEnd(error) {
            if (error && !duplicateServerBuild) {
              serverBuildStatus?.reject(error);
              failCycle(error);
            }
          },
          async writeBundle() {
            try {
              if (
                !closing &&
                !duplicateServerBuild &&
                serverBuildStatus?.state !== 'rejected'
              ) {
                await onServerBuildFinish?.(cycle, result);
                if (activeCycle) {
                  activeCycle = false;
                  onBuildFinish?.(cycle, result);
                }
              }
            } catch (error) {
              failCycle(
                error instanceof Error ? error : new Error(String(error)),
              );
              if (!watch || !onBuildError) throw error;
            } finally {
              serverBuildStatus?.resolve();
            }
          },
          closeWatcher() {
            if (closing) return;
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
    })
    .catch(async (error: unknown) => {
      await close();
      throw error;
    });

  if ('close' in serverBuild) {
    buildWatchers.add(serverBuild);
    registerCleanup?.(close);
  }
  signal?.throwIfAborted();

  if (!watch) {
    await Promise.all([
      removeFile(joinPath(clientOutDir, '.vite')),
      removeFile(joinPath(serverOutDir, '.vite')),
      removeFile(joinPath(serverOutDir, 'assets')),
    ]);
  }

  const codegenOptions = {
    rootDirectory: root,
    appDirectory: remixConfig.appDirectory,
    configFilePath: codegenConfigPath,
  };

  codegenProcess = useCodegen
    ? watch
      ? spawnCodegenProcess(codegenOptions)
      : await codegen(codegenOptions).then(() => undefined)
    : undefined;

  if (codegenProcess) registerCleanup?.(close);
  if (!watch && process.env.NODE_ENV !== 'development') {
    if (bundleStats) {
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
    result,
    close,
  };
}
