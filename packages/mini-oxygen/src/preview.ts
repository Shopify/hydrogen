import { MiniOxygen } from './mini-oxygen/core';
import * as path from 'path';
import * as fs from 'fs';

class WorkerNotFoundError extends Error {
  name = 'WorkerNotFoundError';
  message = 'A worker file is required for this command. Try building your project or check your mini-oxygen config file to ensure a workerFile is specified and the path is correct.'
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
    workerFile,
    assetsDir,
    watch = false,
    buildWatchPaths,
    buildCommand,
    autoReload = false,
    modules = true,
    env = {},
  } = opts;
  const root = process.cwd();

  if (!workerFile || !fs.existsSync(workerFile)) {
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

  const app = await mf.createServer({ assetsDir: assetsDir ? path.resolve(root, assetsDir) : undefined, autoReload });

  app.listen(port, () => {
    ui.say(
      `\nStarted miniOxygen server. Listening at http://localhost:${port}\n`
    );
  });
}
