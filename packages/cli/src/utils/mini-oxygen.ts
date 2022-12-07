import path from 'path';
import miniOxygen from '@shopify/mini-oxygen';
import {output} from '@shopify/cli-kit';
import colors from '@shopify/cli-kit/node/colors';

const miniOxygenPreview =
  miniOxygen.default ?? (miniOxygen as unknown as typeof miniOxygen.default);

type MiniOxygenOptions = {
  root: string;
  port?: number;
  watch?: boolean;
  buildPathClient: string;
  buildPathWorkerFile: string;
};

export async function startMiniOxygen({
  root,
  port = 3000,
  watch = false,
  buildPathWorkerFile,
  buildPathClient,
}: MiniOxygenOptions) {
  const {port: actualPort} = await miniOxygenPreview({
    workerFile: buildPathWorkerFile,
    assetsDir: buildPathClient,
    publicPath: '',
    port,
    watch,
    autoReload: watch,
    modules: true,
    env: process.env,
    envPath: path.resolve(root, '.env'),
    log: () => {},
    buildWatchPaths: watch
      ? [path.resolve(root, buildPathWorkerFile)]
      : undefined,
  });

  console.log(
    `🚥 MiniOxygen server started at http://localhost:${actualPort}\n`,
  );
}
