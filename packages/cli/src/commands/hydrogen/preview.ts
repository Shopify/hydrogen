import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {AbortError} from '@shopify/cli-kit/node/error';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {joinPath, resolvePath} from '@shopify/cli-kit/node/path';
import {isH2Verbose, muteDevLogs, setH2OVerbose} from '../../lib/log.js';
import {getProjectPaths, isClassicProject} from '../../lib/remix-config.js';
import {
  DEFAULT_APP_PORT,
  commonFlags,
  deprecated,
  flagsToCamelObject,
  overrideFlag,
} from '../../lib/flags.js';
import {startMiniOxygen, type MiniOxygen} from '../../lib/mini-oxygen/index.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getConfig} from '../../lib/shopify-config.js';
import {findPort} from '../../lib/find-port.js';
import {
  getViteConfig,
  REMIX_COMPILER_ERROR_MESSAGE,
} from '../../lib/vite-config.js';
import {runBuild} from './build.js';
import {setupResourceCleanup} from '../../lib/resource-cleanup.js';
import {deferPromise} from '../../lib/defer.js';

export default class Preview extends Command {
  static descriptionWithMarkdown =
    "Runs a server in your local development environment that serves your Hydrogen app's production build. Requires running the [build](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-build) command first.";

  static description =
    'Runs a Hydrogen storefront in an Oxygen worker for production.';

  static flags = {
    ...commonFlags.path,
    ...commonFlags.port,
    ...commonFlags.env,
    ...commonFlags.envBranch,
    ...commonFlags.envFile,
    ...commonFlags.inspectorPort,
    ...commonFlags.debug,
    ...commonFlags.verbose,

    // For building the app:
    build: Flags.boolean({
      description: 'Builds the app before starting the preview server.',
    }),
    watch: Flags.boolean({
      description: 'Watches for changes and rebuilds the project.',
      dependsOn: ['build'],
    }),
    ...overrideFlag(commonFlags.entry, {
      entry: {dependsOn: ['build']},
    }),
    ...overrideFlag(commonFlags.codegen, {
      codegen: {dependsOn: ['build']},
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Preview);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    const {close} = await runPreview({
      ...flagsToCamelObject(flags),
      directory,
    });

    setupResourceCleanup(async () => {
      await close();
    });
  }
}

type PreviewOptions = {
  port?: number;
  directory?: string;
  env?: string;
  envBranch?: string;
  inspectorPort?: number;
  debug: boolean;
  verbose?: boolean;
  build?: boolean;
  watch?: boolean;
  entry?: string;
  codegen?: boolean;
  codegenConfigPath?: string;
  envFile: string;
};

export async function runPreview({
  port: appPort,
  directory,
  env: envHandle,
  envBranch,
  inspectorPort,
  debug,
  verbose,
  build: shouldBuild = false,
  watch = false,
  codegen: useCodegen = false,
  codegenConfigPath,
  entry,
  envFile,
}: PreviewOptions) {
  if (!process.env.NODE_ENV)
    process.env.NODE_ENV = watch ? 'development' : 'production';

  if (verbose) setH2OVerbose();
  if (!isH2Verbose()) muteDevLogs();

  let {root, buildPath, buildPathWorkerFile, buildPathClient} =
    getProjectPaths(directory);

  const useClassicCompiler = await isClassicProject(root);

  if (useClassicCompiler) {
    throw new AbortError(REMIX_COMPILER_ERROR_MESSAGE);
  }

  let miniOxygen: MiniOxygen;
  const projectBuild = deferPromise();

  const buildOptions = {
    directory: root,
    entry,
    disableRouteWarning: false,
    lockfileCheck: false,
    sourcemap: true,
    bundleStats: false,
    useCodegen,
    codegenConfigPath,
  };

  const buildProcess = shouldBuild
    ? await runBuild({
        ...buildOptions,
        watch,
        async onServerBuildFinish() {
          if (projectBuild.state === 'pending') {
            projectBuild.resolve();
          } else {
            outputInfo('🏗️  Project rebuilt. Reloading server...');
          }

          await miniOxygen?.reload();
        },
      })
    : projectBuild.resolve();

  if (!useClassicCompiler) {
    const maybeResult = await getViteConfig(root).catch(() => null);
    buildPathWorkerFile =
      maybeResult?.serverOutFile ?? joinPath(buildPath, 'server', 'index.js');
  }

  const {shop, storefront} = await getConfig(root);
  const fetchRemote = !!shop && !!storefront?.id;
  const {allVariables, logInjectedVariables} = await getAllEnvironmentVariables(
    {
      root,
      fetchRemote,
      envBranch,
      envHandle,
      envFile,
    },
  );

  if (!appPort) {
    appPort = await findPort(DEFAULT_APP_PORT);
  }

  const assetsPort = await findPort(appPort + 100);

  // Note: we don't need to add any asset prefix in preview because
  // we don't control the build at this point. However, the assets server
  // still need to be started to serve redirections from the worker runtime.

  await projectBuild.promise;

  logInjectedVariables();

  miniOxygen = await startMiniOxygen({
    root,
    appPort,
    assetsPort,
    env: allVariables,
    buildPathClient,
    buildPathWorkerFile,
    inspectorPort,
    debug,
    watch,
  });

  miniOxygen.showBanner({
    mode: 'preview',
    headlinePrefix: watch ? 'Watching for changes. ' : '',
  });

  return {
    async close() {
      await Promise.allSettled([miniOxygen.close(), buildProcess?.close()]);
    },
  };
}
