import {MiniOxygen} from './mini-oxygen/core';
import * as path from 'path';
import * as fs from 'fs';

export type MiniOxygenPreviewOptions = Partial<{
    ui: {
        say(message: string): unknown
    },
    port: number,
    workerFile: string,
    assetsDir: string,
    buildCommand: string,
    buildWatchPaths: string[],
    autoReload: boolean,
}>

export const configFileName = 'mini-oxygen.config.json';

export async function preview(opts: MiniOxygenPreviewOptions) {
  const {
      ui = { say: (m: string) => console.log(m) },
      port = 3000,
      workerFile = 'dist/worker/index.js',
      assetsDir = 'dist/client',
      buildWatchPaths = ['./src'],
      buildCommand = 'yarn build',
      autoReload = true,
  } = opts;
  const root = process.cwd();

  if (!fs.existsSync(workerFile)) {
    throw {
        title: 'worker not found',
        content: 'A worker build is required for this command.',
        suggestion: () =>
            `Run \`yarn build\` to generate a worker build and try again.`,
    }
  }

  const mf = new MiniOxygen(
    {
      buildCommand,
      scriptPath: path.resolve(root, workerFile),
      watch: true,
      buildWatchPaths,
    },
    {}
  );

  const app = await mf.createServer({assetsDir, autoReload});

  app.listen(port, () => {
    ui.say(
      `\nStarted miniOxygen server. Listening at http://localhost:${port}\n`
    );
  });
}
