import * as path from 'path';
import * as fs from 'fs';

import {MiniOxygen} from './mini-oxygen/core';

class WorkerNotFoundError extends Error {
  name = 'WorkerNotFoundError';
  message =
    'A worker file is required for this command. Try building your project or check your mini-oxygen config file to ensure a workerFile is specified and the path is correct.';
}

export type MiniOxygenPreviewOptions = Partial<{
  log(message: string): unknown;
  port: number;
  workerFile: string;
  assetsDir: string;
  publicPath: string;
  watch: boolean;
  modules: boolean;
  buildCommand: string;
  buildWatchPaths: string[];
  autoReload: boolean;
  env: {[key: string]: unknown};
}>;

export const configFileName = 'mini-oxygen.config.json';

export async function preview(opts: MiniOxygenPreviewOptions) {
  const {
    // eslint-disable-next-line no-console
    log = (message: string) => console.log(message),
    port = 3000,
    workerFile,
    assetsDir,
    publicPath,
    watch = false,
    buildWatchPaths,
    buildCommand,
    autoReload = false,
    modules = true,
    env = {},
  } = opts;
  const root = process.cwd();

  if (!workerFile || !fs.existsSync(workerFile)) {
    throw new WorkerNotFoundError();
  }

  const mf = new MiniOxygen(
    {
      buildCommand,
      scriptPath: path.resolve(root, workerFile),
      watch,
      modules,
      buildWatchPaths,
      compatibilityFlags: ['streams_enable_constructors'],
    },
    env,
  );

  const app = mf.createServer({
    assetsDir: assetsDir ? path.resolve(root, assetsDir) : undefined,
    publicPath,
    autoReload,
  });

  // eslint-disable-next-line promise/param-names
  await new Promise<void>((res) =>
    app.listen(port, () => {
      log(
        `\nStarted miniOxygen server. Listening at http://localhost:${port}\n`,
      );
      res();
    }),
  );
}
