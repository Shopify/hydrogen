import Command from '@shopify/cli-kit/node/base-command';
import {muteDevLogs} from '../../lib/log.js';
import {getProjectPaths} from '../../lib/remix-config.js';
import {
  commonFlags,
  flagsToCamelObject,
  DEFAULT_PORT,
} from '../../lib/flags.js';
import {startMiniOxygen} from '../../lib/mini-oxygen/index.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getConfig} from '../../lib/shopify-config.js';

export default class Preview extends Command {
  static description =
    'Runs a Hydrogen storefront in an Oxygen worker for production.';

  static flags = {
    path: commonFlags.path,
    port: commonFlags.port,
    ['worker-unstable']: commonFlags.workerRuntime,
    ['env-branch']: commonFlags.envBranch,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Preview);

    await runPreview({
      ...flagsToCamelObject(flags),
      workerRuntime: flags['worker-unstable'],
    });
  }
}

export async function runPreview({
  port = DEFAULT_PORT,
  path: appPath,
  workerRuntime = false,
  envBranch,
}: {
  port?: number;
  path?: string;
  workerRuntime?: boolean;
  envBranch?: string;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

  muteDevLogs({workerReload: false});

  const {root, buildPathWorkerFile, buildPathClient} = getProjectPaths(appPath);
  const {shop, storefront} = await getConfig(root);
  const fetchRemote = !!shop && !!storefront?.id;
  const env = await getAllEnvironmentVariables({root, fetchRemote, envBranch});

  const miniOxygen = await startMiniOxygen(
    {
      root,
      port,
      buildPathClient,
      buildPathWorkerFile,
      env,
    },
    workerRuntime,
  );

  miniOxygen.showBanner({mode: 'preview'});
}
