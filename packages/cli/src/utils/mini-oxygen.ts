import miniOxygen from '@shopify/mini-oxygen';

const miniOxygenPreview =
  miniOxygen.default ?? (miniOxygen as unknown as typeof miniOxygen.default);

type MiniOxygenOptions = {
  port?: number;
  buildPathClient: string;
  buildPathWorkerFile: string;
  buildCommand?: string;
  buildWatchPaths?: string[];
};

export async function startMiniOxygen({
  port = 3000,
  buildPathWorkerFile,
  buildPathClient,
  buildCommand,
  buildWatchPaths,
}: MiniOxygenOptions) {
  const watch = !!buildWatchPaths;

  miniOxygenPreview({
    workerFile: buildPathWorkerFile,
    assetsDir: buildPathClient,
    publicPath: '',
    port,
    watch,
    autoReload: watch,
    buildCommand: watch ? buildCommand : undefined,
    buildWatchPaths,
    modules: true,
    env: process.env,
  });
}
