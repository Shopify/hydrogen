import Command from '@shopify/cli-kit/node/base-command';
import {isH2Verbose, muteDevLogs, setH2OVerbose} from '../../lib/log.js';
import {getProjectPaths, hasRemixConfigFile} from '../../lib/remix-config.js';
import {
  DEFAULT_APP_PORT,
  commonFlags,
  deprecated,
  flagsToCamelObject,
} from '../../lib/flags.js';
import {startMiniOxygen} from '../../lib/mini-oxygen/index.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getConfig} from '../../lib/shopify-config.js';
import {findPort} from '../../lib/find-port.js';
import {joinPath} from '@shopify/cli-kit/node/path';
import {getViteConfig} from '../../lib/vite-config.js';

export default class Preview extends Command {
  static descriptionWithMarkdown =
    "Runs a server in your local development environment that serves your Hydrogen app's production build. Requires running the [build](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-build) command first.";

  static description =
    'Runs a Hydrogen storefront in an Oxygen worker for production.';

  static flags = {
    ...commonFlags.path,
    ...commonFlags.port,
    worker: deprecated('--worker', {isBoolean: true}),
    ...commonFlags.legacyRuntime,
    ...commonFlags.env,
    ...commonFlags.envBranch,
    ...commonFlags.inspectorPort,
    ...commonFlags.debug,
    ...commonFlags.verbose,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Preview);

    await runPreview({
      ...flagsToCamelObject(flags),
    });
  }
}

type PreviewOptions = {
  port?: number;
  path?: string;
  legacyRuntime?: boolean;
  env?: string;
  envBranch?: string;
  inspectorPort?: number;
  debug: boolean;
  verbose?: boolean;
};

export async function runPreview({
  port: appPort,
  path: appPath,
  legacyRuntime = false,
  env: envHandle,
  envBranch,
  inspectorPort,
  debug,
  verbose,
}: PreviewOptions) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

  if (verbose) setH2OVerbose();
  if (!isH2Verbose()) muteDevLogs();

  let {root, buildPath, buildPathWorkerFile, buildPathClient} =
    getProjectPaths(appPath);

  if (!(await hasRemixConfigFile(root))) {
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
    },
  );

  if (!appPort) {
    appPort = await findPort(DEFAULT_APP_PORT);
  }

  const assetsPort = legacyRuntime ? 0 : await findPort(appPort + 100);

  // Note: we don't need to add any asset prefix in preview because
  // we don't control the build at this point. However, the assets server
  // still need to be started to serve redirections from the worker runtime.

  logInjectedVariables();

  const miniOxygen = await startMiniOxygen(
    {
      root,
      appPort,
      assetsPort,
      env: allVariables,
      buildPathClient,
      buildPathWorkerFile,
      inspectorPort,
      debug,
    },
    legacyRuntime,
  );

  miniOxygen.showBanner({mode: 'preview'});
}
