import * as path from 'path';
import * as fs from 'fs';
import type {Socket} from 'net';

import getPort from 'get-port';

import {MiniOxygen} from './mini-oxygen/core.js';
import type {MiniOxygenServerOptions} from './mini-oxygen/server.js';

class WorkerNotFoundError extends Error {
  name = 'WorkerNotFoundError';
  message =
    'A worker file is required for this command. Try building your project to ensure a workerFile is present.';
}

export type MiniOxygenPreviewOptions = MiniOxygenServerOptions &
  Partial<{
    log(message: string): unknown;
    port: number;
    workerFile: string;
    watch: boolean;
    modules: boolean;
    buildCommand: string;
    buildWatchPaths: string[];
    sourceMap: boolean;
    envPath: string;
    env: {[key: string]: unknown};
  }>;

interface MiniOxygenPublicInstance {
  port: number;
  close: () => Promise<void>;
  reload: (
    options?: Partial<Pick<MiniOxygenPreviewOptions, 'env'>>,
  ) => Promise<void>;
}

export async function startServer(
  opts: MiniOxygenPreviewOptions,
): Promise<MiniOxygenPublicInstance> {
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
    sourceMap = true,
    proxyServer,
    envPath,
    env = {},
    oxygenHeaders,
    onRequest,
    onResponseError,
    onResponse = (req, res) => {
      log(
        `${req.method}  ${res.status}  ${req.url.replace(
          new URL(req.url).origin,
          '',
        )}`,
      );
    },
  } = opts;

  const root = process.cwd();

  if (!workerFile || !fs.existsSync(workerFile)) {
    throw new WorkerNotFoundError();
  }

  if (
    publicPath !== undefined &&
    publicPath.length > 0 &&
    !publicPath.endsWith('/')
  ) {
    log(`\nWARNING: publicPath must end with a trailing slash`);
  }

  const mf = new MiniOxygen(
    {
      buildCommand,
      envPath,
      scriptPath: path.resolve(root, workerFile),
      watch,
      modules,
      sourceMap,
      buildWatchPaths,
      // this should stay in sync with oxygen-dms
      compatibilityFlags: ['streams_enable_constructors'],
      compatibilityDate: '2022-10-31',
    },
    env,
  );

  const app = mf.createServer({
    assetsDir: assetsDir ? path.resolve(root, assetsDir) : undefined,
    publicPath,
    autoReload,
    proxyServer,
    oxygenHeaders,
    onRequest,
    onResponse,
    onResponseError,
  });

  const actualPort = await getPort({port});
  if (actualPort !== port) {
    log(
      `\nWARNING: Port ${port} is not available. Using ${actualPort} instead.`,
    );
  }

  const sockets = new Set<Socket>();
  app.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });

  // eslint-disable-next-line promise/param-names
  return new Promise((res) => {
    app.listen(actualPort, () => {
      log(
        `\nStarted miniOxygen server. Listening at http://localhost:${actualPort}\n`,
      );

      res({
        port: actualPort,
        reload(options) {
          return mf.setOptions({bindings: options?.env});
        },
        close() {
          return new Promise((resolve, reject) => {
            sockets.forEach((socket) => socket.destroy());
            sockets.clear();
            app.close(() => {
              mf.dispose().then(resolve).catch(reject);
            });
          });
        },
      });
    });
  });
}
