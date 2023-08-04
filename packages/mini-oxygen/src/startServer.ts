import * as path from 'path';
import * as fs from 'fs';
import type {Socket} from 'net';

import getPort from 'get-port';

import {MiniOxygen} from './mini-oxygen/core.js';
import type {MiniOxygenServerOptions} from './mini-oxygen/server.js';

class WorkerNotFoundError extends Error {
  name = 'WorkerNotFoundError';
  message =
    'A worker script or file is required for this command. Try building your project to ensure a workerFile is present, or pass its content in the `script` option.';
}

export type MiniOxygenOptions = Partial<{
  log(message: string): unknown;
  workerFile?: string;
  script?: string;
  rootPath: string;
  watch: boolean;
  modules: boolean;
  buildCommand: string;
  buildWatchPaths: string[];
  sourceMap: boolean;
  envPath: string;
  env: {[key: string]: unknown};
}>;

export type MiniOxygenCreateServerOptions = MiniOxygenServerOptions & {
  port?: number;
};

export type MiniOxygenPreviewOptions = MiniOxygenOptions &
  MiniOxygenCreateServerOptions;

interface MiniOxygenPublicInstance {
  ready: () => Promise<void>;
  dispose: () => Promise<void>;
  reload: (
    options?: Partial<Pick<MiniOxygenPreviewOptions, 'env' | 'script'>>,
  ) => Promise<void>;
  createServer: (opts: MiniOxygenCreateServerOptions) => Promise<{
    port: number;
    close: () => Promise<void>;
  }>;
}

export function createMiniOxygen(
  opts: MiniOxygenOptions,
): MiniOxygenPublicInstance {
  const {
    // eslint-disable-next-line no-console
    log = (message: string) => console.log(message),
    workerFile,
    script,
    rootPath,
    watch = false,
    buildWatchPaths,
    buildCommand,
    modules = true,
    sourceMap = true,
    envPath,
    env = {},
  } = opts;

  const root = rootPath ?? process.cwd();

  if (!script && (!workerFile || !fs.existsSync(workerFile))) {
    throw new WorkerNotFoundError();
  }

  if (script && workerFile) {
    throw new Error('Only one of `script` or `workerFile` can be provided.');
  }

  const mf = new MiniOxygen(
    {
      buildCommand,
      envPath,
      script,
      scriptPath: workerFile ? path.resolve(root, workerFile) : undefined,
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

  return {
    async ready() {
      // Miniflare awaits internally for the #init promise to resolve,
      // which means that it has loaded the initial worker code.
      await mf.getPlugins();
    },
    async reload({env, ...nextOptions} = {}) {
      await mf.setOptions({...nextOptions, ...(env && {bindings: env})});
    },
    async dispose() {
      await mf.dispose();
    },
    async createServer(serverOptions) {
      const {
        assetsDir,
        publicPath,
        port = 3000,
        autoReload = false,
        proxyServer,
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
      } = serverOptions;

      if (
        publicPath !== undefined &&
        publicPath.length > 0 &&
        !publicPath.endsWith('/')
      ) {
        log(`\nWARNING: publicPath must end with a trailing slash`);
      }

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
            close: () =>
              new Promise((resolve) => {
                sockets.forEach((socket) => socket.destroy());
                sockets.clear();
                app.close(() => resolve(undefined));
              }),
          });
        });
      });
    },
  };
}

export async function startServer(opts: MiniOxygenPreviewOptions) {
  const {createServer, dispose, reload} = createMiniOxygen(opts);
  const {port, close} = await createServer(opts);

  return {
    port,
    reload,
    close: () => close().then(dispose),
  };
}
