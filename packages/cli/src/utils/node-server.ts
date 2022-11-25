import fsExtra from 'fs-extra';
import childProcess from 'child_process';
import {createRequire} from 'module';
import {installGlobals} from '@remix-run/node';

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
    console.error(
      new Error('This Node server should only be used for development!'),
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
    const {
      default: {fetch: fetchHandler},
    } = require(buildPathWorkerFile);

    request.headers['get'] = (prop: string) => request.headers[prop];
    const origin = `${request.protocol}://${request.get('host')}`;
    const url = new URL(request.url, origin);
    request.url = url.toString();

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

export {setupNodeServer};
