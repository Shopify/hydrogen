import Command from '@shopify/cli-kit/node/base-command';
import {muteDevLogs} from '../../utils/log.js';
import {getProjectPaths} from '../../utils/config.js';
import {commonFlags} from '../../utils/flags.js';
import {startMiniOxygen} from '../../utils/mini-oxygen.js';

export default class Preview extends Command {
  static description =
    'Runs a Hydrogen storefront in an Oxygen worker for production.';
  static flags = {
    path: commonFlags.path,
    port: commonFlags.port,
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

  muteDevLogs({workerReload: false});

  const {root, buildPathWorkerFile, buildPathClient} = getProjectPaths(appPath);

  await startMiniOxygen({
    root,
    port,
    buildPathClient,
    buildPathWorkerFile,
  });
}
