import Command from '@shopify/cli-kit/node/base-command';
import {muteDevLogs} from '../../lib/log.js';
import {getProjectPaths} from '../../lib/remix-config.js';
import {commonFlags, deprecated, flagsToCamelObject} from '../../lib/flags.js';
import {startMiniOxygen} from '../../lib/mini-oxygen/index.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getConfig} from '../../lib/shopify-config.js';
import {findPort} from '../../lib/find-port.js';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {getViteConfig} from '../../lib/vite-config.js';

export default class Preview extends Command {
  static description =
    'Runs a Hydrogen storefront in an Oxygen worker for production.';

  static flags = {
    ...commonFlags.path,
    ...commonFlags.port,
    worker: deprecated('--worker', {isBoolean: true}),
    ...commonFlags.legacyRuntime,
    ...commonFlags.envBranch,
    ...commonFlags.inspectorPort,
    ...commonFlags.debug,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Preview);

    await runPreview({
      ...flagsToCamelObject(flags),
    });
  }
}

type PreviewOptions = {
  port: number;
  path?: string;
  legacyRuntime?: boolean;
  envBranch?: string;
  inspectorPort: number;
  debug: boolean;
};

export async function runPreview({
  port: appPort,
  path: appPath,
  legacyRuntime = false,
  envBranch,
  inspectorPort,
  debug,
}: PreviewOptions) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

  muteDevLogs({workerReload: false});

  let {root, buildPathWorkerFile, buildPathClient} = getProjectPaths(appPath);

  if (!(await fileExists(joinPath(root, buildPathWorkerFile)))) {
    const maybeResult = await getViteConfig(root).catch(() => null);
    if (maybeResult) buildPathWorkerFile = maybeResult.serverOutFile;
  }

  const {shop, storefront} = await getConfig(root);
  const fetchRemote = !!shop && !!storefront?.id;
  const env = await getAllEnvironmentVariables({root, fetchRemote, envBranch});

  appPort = legacyRuntime ? appPort : await findPort(appPort);
  inspectorPort = debug ? await findPort(inspectorPort) : inspectorPort;
  const assetsPort = legacyRuntime ? 0 : await findPort(appPort + 100);

  // Note: we don't need to add any asset prefix in preview because
  // we don't control the build at this point. However, the assets server
  // still need to be started to serve redirections from the worker runtime.

  const miniOxygen = await startMiniOxygen(
    {
      root,
      port: appPort,
      assetsPort,
      env,
      buildPathClient,
      buildPathWorkerFile,
      inspectorPort,
      debug,
    },
    legacyRuntime,
  );

  miniOxygen.showBanner({mode: 'preview'});
}
