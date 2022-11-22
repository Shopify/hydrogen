import {muteDevLogs} from '../../utils/log.js';
import {getProjectPaths} from '../../utils/config.js';
import {flags} from '../../utils/flags.js';
import miniOxygen from '@shopify/mini-oxygen';
import Command from '@shopify/cli-kit/node/base-command';

const miniOxygenPreview =
  miniOxygen.default ?? (miniOxygen as unknown as typeof miniOxygen.default);

// @ts-ignore
export default class Preview extends Command {
  static description =
    'Runs an existing Hydrogen storefront build in a MiniOxygen worker';
  static flags = {
    paths: flags.path,
    port: flags.port,
  };

  async run(): Promise<void> {
    // @ts-ignore
    const {flags} = await this.parse(Preview);

    await runPreview({...flags});
  }
}

export async function runPreview({
  port,
  path: appPath,
}: {
  port?: number;
  path?: string;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

  const {buildPathWorkerFile, buildPathClient} = getProjectPaths(appPath);

  muteDevLogs({workerReload: false});

  // Run MiniOxygen and watch worker build
  miniOxygenPreview({
    workerFile: buildPathWorkerFile,
    port,
    assetsDir: buildPathClient,
    publicPath: '',
    modules: true,
    env: process.env,
  });
}
