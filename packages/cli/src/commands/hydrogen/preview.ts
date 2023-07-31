import Command from '@shopify/cli-kit/node/base-command';
import {muteDevLogs} from '../../lib/log.js';
import {getProjectPaths} from '../../lib/remix-config.js';
import {commonFlags} from '../../lib/flags.js';
import {startMiniOxygen} from '../../lib/mini-oxygen.js';

export default class Preview extends Command {
  static description =
    'Runs a Hydrogen storefront in an Oxygen worker for production.';

  static flags = {
    path: commonFlags.path,
    port: commonFlags.port,
  };

  async run(): Promise<void> {
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

  const miniOxygen = await startMiniOxygen({
    root,
    port,
    buildPathClient,
    buildPathWorkerFile,
  });

  miniOxygen.showBanner({mode: 'preview'});
}
