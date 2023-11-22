import Command from '@shopify/cli-kit/node/base-command';
import {muteDevLogs} from '../../lib/log.js';
import {getProjectPaths} from '../../lib/remix-config.js';
import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {startMiniOxygen} from '../../lib/mini-oxygen/index.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getConfig} from '../../lib/shopify-config.js';
import {findPort} from '../../lib/find-port.js';

export default class Preview extends Command {
  static description =
    'Runs a Hydrogen storefront in an Oxygen worker for production.';

  static flags = {
    path: commonFlags.path,
    port: commonFlags.port,
    worker: commonFlags.workerRuntime,
    'env-branch': commonFlags.envBranch,
    'inspector-port': commonFlags.inspectorPort,
    debug: commonFlags.debug,
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
  worker?: boolean;
  envBranch?: string;
  inspectorPort: number;
  debug: boolean;
};

export async function runPreview({
  port: appPort,
  path: appPath,
  worker: workerRuntime = false,
  envBranch,
  inspectorPort,
  debug,
}: PreviewOptions) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

  muteDevLogs({workerReload: false});

  const {root, buildPathWorkerFile, buildPathClient} = getProjectPaths(appPath);
  const {shop, storefront} = await getConfig(root);
  const fetchRemote = !!shop && !!storefront?.id;
  const env = await getAllEnvironmentVariables({root, fetchRemote, envBranch});

  appPort = workerRuntime ? await findPort(appPort) : appPort;
  inspectorPort = debug ? await findPort(inspectorPort) : inspectorPort;

  const miniOxygen = await startMiniOxygen(
    {
      root,
      port: appPort,
      env,
      buildPathClient,
      buildPathWorkerFile,
      inspectorPort,
      debug,
    },
    workerRuntime,
  );

  miniOxygen.showBanner({mode: 'preview'});
}
