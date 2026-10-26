import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {devSessionJsonOutputSchema} from '../../lib/dev-session/types.js';
import {logRequestLine} from '../../lib/mini-oxygen/common.js';
import {Flags} from '@oclif/core';
import Command from '../../lib/hydrogen-command.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import {outputInfo, stringifyMessage} from '@shopify/cli-kit/node/output';
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
import {runDevSession, type DevSession} from '../../lib/dev-session.js';
import {deferPromise} from '../../lib/defer.js';

export default class Preview extends Command {
  static get jsonOutputSchema(): typeof devSessionJsonOutputSchema {
    return devSessionJsonOutputSchema;
  }

  static descriptionWithMarkdown = `Runs a server in your local development environment that serves your Hydrogen app's production build. Run the [build](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-build) command first, or use \`--build\` to build before starting the server.

  Session status and JSONL logs are stored in your project's \`.shopify/dev/\` directory. The instance JSON includes the PID, session ID, \`logFile\`, and \`details.urls\`. Status becomes \`running\` when the server is ready.

  Only one preview session can run for the same project, environment, environment branch, and environment file, even with a different port. Shutdown removes the instance and lock files and retains the log. The log resets on each run. Dev and preview use separate sessions. With \`--build --watch\`, each completed rebuild reloads the worker and adds a log message.

  Use \`--json\` to stream the same JSONL records to stdout. Readiness URLs appear in the \`Ready: ...\` message and \`details.urls\`. Diagnostics use stderr. Fatal errors write the standard JSON error envelope to stdout and exit nonzero; they are excluded from the session log. There is no final success result. JSON output does not disable prompts; use \`--no-input\` to disable interactivity.`;

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
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

    await runDevSession(
      {
        command: 'hydrogen preview',
        directory,
        ...flagsToCamelObject(flags),
      },
      (session) =>
        runPreview({
          ...flagsToCamelObject(flags),
          directory,
          session,
        }),
    );
  }
}

type PreviewOptions = {
  session?: DevSession;
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
  session,
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
  if (!session?.json && !isH2Verbose()) muteDevLogs();

  let {root, buildPath, buildPathWorkerFile, buildPathClient} =
    getProjectPaths(directory);

  const useClassicCompiler = await isClassicProject(root);

  if (useClassicCompiler) {
    throw new AbortError(REMIX_COMPILER_ERROR_MESSAGE);
  }

  let miniOxygen: MiniOxygen;
  const projectBuild = deferPromise();
  session?.cleanup(async () => {
    // A cancelled initial build might never reach its completion hook.
    projectBuild.resolve();
  });

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
        json: session?.json,
        watch,
        onCodegenOutput: session?.log,
        signal: session?.signal,
        registerCleanup: session?.cleanup,
        onServerBuildStart() {
          session?.log('Building preview');
        },
        async onServerBuildFinish() {
          if (projectBuild.state === 'pending') {
            projectBuild.resolve();
          } else {
            if (session?.json) session.log('Project rebuilt. Reloading server');
            else outputInfo('🏗️  Project rebuilt. Reloading server...');
          }

          session?.signal.throwIfAborted();
          await miniOxygen?.reload();
          if (miniOxygen) session?.log('Runtime reloaded');
        },
      })
    : projectBuild.resolve();

  session?.signal.throwIfAborted();

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
      signal: session?.signal,
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
  session?.signal.throwIfAborted();

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
    registerCleanup: session?.cleanup,
    logRequestLine: (info) =>
      logRequestLine(
        info,
        (message) => {
          if (session?.json) session.log(stringifyMessage(message));
          else outputInfo(message);
        },
        {preserveQuery: session?.json},
      ),
  });

  await session?.ready([miniOxygen.listeningAt]);

  if (!session?.json)
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
