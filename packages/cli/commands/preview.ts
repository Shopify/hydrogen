import miniOxygenPreview from '@shopify/mini-oxygen';
import {muteDevLogs} from '../utils/log';
import {getProjectPaths} from '../utils/config';

export async function runPreview({
  port = 3000,
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
