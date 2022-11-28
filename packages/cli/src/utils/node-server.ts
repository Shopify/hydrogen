import fsExtra from 'fs-extra';
import childProcess from 'child_process';
import {createRequire} from 'module';
import {installGlobals} from '@remix-run/node';
import type {BuildOptions} from 'esbuild';
import type {IncomingMessage} from 'http';

type NodeServerOptions = {
  port?: number;
  buildCommand: string;
  buildPathWorkerFile: string;
  buildPathClient: string;
  buildWatchPaths: string[];
  env: Record<string, string | undefined>;
};

const HTML_ENDING = '</body></html>';

async function setupNodeServer({
  port = 3000,
  buildCommand,
  buildPathClient,
  buildWatchPaths,
  buildPathWorkerFile,
  env,
}: NodeServerOptions) {
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      'Running Node server in production. The Node server should only be used for development!',
    );
  }

  installGlobals();
  const require = createRequire(import.meta.url);

  const express = require('express');
  const app = express();
  app.disable('x-powered-by');

  app.use('', express.static(buildPathClient, {immutable: true, maxAge: '1s'}));

  const wsPort = port + 1;
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({port: wsPort});

  app.all('*', async (request: any, response: any, next: any) => {
    const {fetch: fetchHandler} = require(buildPathWorkerFile);

    // Inject live reload script in HTML responses
    const decoder = new TextDecoder();
    const write = response.write.bind(response);
    response.write = (encoded: Uint8Array) => {
      const decoded = decoder.decode(encoded);
      if (!decoded.includes(HTML_ENDING)) return write(encoded);

      return write(
        decoded.replace(
          HTML_ENDING,
          `<script>new WebSocket("ws://localhost:${wsPort}").addEventListener("message", () => window.location.reload());</script>` +
            HTML_ENDING,
        ),
      );
    };

    try {
      await fetchHandler(request, env, {response, next});
    } catch (error) {
      next(error);
    }
  });

  app.listen(port, () => {
    console.log(`Started Node server. Listening at http://localhost:${port}`);
  });

  buildWatchPaths.forEach((filepath) => {
    let lastRefreshTime = 0;

    fsExtra.watch(filepath, {}, async () => {
      const stat = await fsExtra.stat(filepath);
      const currentTime = Math.floor(stat.mtimeMs);
      if (currentTime === lastRefreshTime) return;
      lastRefreshTime = currentTime;

      childProcess.exec(buildCommand, () => {
        // Bust cache to always get a fresh build
        delete require.cache[buildPathWorkerFile];

        // Refresh browser
        wss.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({}));
          }
        });

        console.log('Server reloaded!');
      });
    });
  });
}

const nodeFetch = function (request: IncomingMessage, env: any, ctx: any) {
  Object.defineProperty(request.headers, 'get', {
    get: () => (prop: string) => request.headers[prop],
  });

  if (!request.url?.includes('://')) {
    Object.defineProperty(request, 'url', {
      value: new URL(
        request.url ?? '',
        // @ts-ignore
        `${request.protocol ?? 'http'}://${
          request.headers.host ?? 'localhost'
        }`,
      ).toString(),
    });
  }

  // @ts-ignore
  return __fetchHandler(request, env, ctx);
};

function addNodeBuildOptions(options: BuildOptions) {
  options.platform = 'node';
  options.format = 'cjs';
  options.conditions?.unshift('node-dev');
  options.footer = {
    js: `const __fetchHandler = module.exports.default.fetch;\nmodule.exports = {fetch:${nodeFetch.toString()}}`,
  };
}

export {setupNodeServer, addNodeBuildOptions};
