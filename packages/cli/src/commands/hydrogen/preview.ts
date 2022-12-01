import {muteDevLogs} from '../../utils/log.js';
import {getProjectPaths} from '../../utils/config.js';
import {flags} from '../../utils/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import {startMiniOxygen} from '../../utils/mini-oxygen.js';

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

  const {root, buildPathWorkerFile, buildPathClient} = getProjectPaths(appPath);

  muteDevLogs({workerReload: false});

  startMiniOxygen({
    root,
    port,
    buildPathClient,
    buildPathWorkerFile,
  });
}
