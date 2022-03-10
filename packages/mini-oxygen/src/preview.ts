import { MiniOxygen } from './mini-oxygen/core';
import * as path from 'path';
import * as fs from 'fs';

class WorkerNotFoundError extends Error {
  name = 'WokerNotFoundError';
  message = 'A worker file is required for this command. Try building your project or check your mini-oxygen config file to ensure the path is correct.'
}

export type MiniOxygenPreviewOptions = Partial<{
  ui: {
    say(message: string): unknown
  },
  port: number,
  workerFile: string,
  assetsDir: string,
  watch: boolean;
  modules: boolean
  buildCommand: string,
  buildWatchPaths: string[],
  autoReload: boolean,
  env: Record<string, unknown>,
}>

export const configFileName = 'mini-oxygen.config.json';

export async function preview(opts: MiniOxygenPreviewOptions) {
  const {
    ui = { say: (m: string) => console.log(m) },
    port = 3000,
    workerFile = 'worker.mjs',
    assetsDir = 'public',
    watch = false,
    buildWatchPaths,
    buildCommand,
    autoReload = false,
    modules = true,
    env = {},
  } = opts;
  const root = process.cwd();

  if (!fs.existsSync(workerFile)) {
    throw new WorkerNotFoundError()
  }
  const mf = new MiniOxygen(
    {
      buildCommand,
      scriptPath: path.resolve(root, workerFile),
      watch,
      modules,
      buildWatchPaths,
    },
    env,
  );

  const app = await mf.createServer({ assetsDir: path.resolve(root, assetsDir), autoReload });

  app.listen(port, () => {
    ui.say(
      `\nStarted miniOxygen server. Listening at http://localhost:${port}\n`
    );
  });
}
