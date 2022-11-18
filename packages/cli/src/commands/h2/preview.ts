import {muteDevLogs} from '../../utils/log.js';
import {getProjectPaths} from '../../utils/config.js';
import {flags} from '../../utils/flags.js';

import {createRequire} from 'node:module';
import {Command} from '@oclif/core';

const require = createRequire(import.meta.url);

const miniOxygenPreview = require('@shopify/mini-oxygen');

export default class Preview extends Command {
  static description = 'Builds a Hydrogen storefront for production';
  static flags = {
    paths: flags.path,
    port: flags.port,
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

  const {buildPathWorkerFile, buildPathClient} = getProjectPaths(appPath);

  muteDevLogs({workerReload: false});

  // Run MiniOxygen and watch worker build
  miniOxygenPreview.default({
    workerFile: buildPathWorkerFile,
    port,
    assetsDir: buildPathClient,
    publicPath: '',
    modules: true,
    env: process.env,
  });
}
