/* eslint-disable @typescript-eslint/no-misused-promises */
import path from 'path';
import http from 'http';
import type {IncomingMessage} from 'http';
import fs from 'fs';

import mime from 'mime';
import {Request, Response} from '@miniflare/core';
import connect from 'connect';
import type {NextHandleFunction} from 'connect';
import bodyParser from 'body-parser';

import type {MiniOxygen} from './core';

export interface MiniOxygenServerHooks {
  onRequest?: (request: Request) => void | Promise<void>;
  onResponse?: (request: Request, response: Response) => void | Promise<void>;
  onResponseError?: (request: Request, error: unknown) => void;
}

export interface MiniOxygenServerOptions extends MiniOxygenServerHooks {
  assetsDir?: string;
  autoReload?: boolean;
  publicPath?: string;
  proxyServer?: string;
}

const SSEUrl = '/events';
const autoReloadScript = `<script defer type="application/javascript">
(function () {
  // MiniOxygen Auto Reload
  var source = new EventSource('${SSEUrl}');
  source.addEventListener('open', function(e) { console.log('Auto Reload Enabled') }, false);
  source.onmessage = function(e) { if (e.data === 'connected') {console.log('Listening for events...');} else if (e.data === 'reload') {location.reload();} };
})();
</script>`;
const autoReloadScriptLength = Buffer.byteLength(autoReloadScript);

function createAssetMiddleware({
  assetsDir,
  publicPath,
  proxyServer,
}: Pick<
  MiniOxygenServerOptions,
  'assetsDir' | 'publicPath' | 'proxyServer'
>): NextHandleFunction {
  return (req, res, next) => {
    if (assetsDir === undefined) {
      return next();
    }

    if (proxyServer !== '' && !req.headers['mini-oxygen-proxy']) {
      return next();
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    let filePath: string;

    if (publicPath === undefined || publicPath === '') {
      const pathname = url.pathname.substring(1);
      if (pathname === '') {
        return next();
      }

      filePath = path.join(assetsDir, pathname);
    } else {
      let pathname = url.pathname;
      // publicPath must always have a trailing slash
      if (pathname.startsWith(publicPath)) {
        pathname = pathname.substring(publicPath.length);
        filePath = path.join(assetsDir, pathname);
      } else {
        return next();
      }
    }

    if (fs.lstatSync(filePath, {throwIfNoEntry: false})?.isFile()) {
      const rs = fs.createReadStream(filePath);
      const {size} = fs.statSync(filePath);

      res.setHeader(
        'Content-Type',
        mime.getType(filePath) || 'application/octet-stream',
      );
      res.setHeader('Content-Length', size);

      return rs.pipe(res);
    }
    next();
  };
}

function writeSSE(res: http.ServerResponse, data: string) {
  const id = new Date().toLocaleTimeString();
  res.write(`id: ${id}\n`);
  res.write(`data: ${data}\n\n`);
}

function createAutoReloadMiddleware(mf: MiniOxygen): NextHandleFunction {
  return (req, res) => {
    if (req.headers.accept && req.headers.accept === 'text/event-stream') {
      mf.addEventListener('reload', () => writeSSE(res, 'reload'));

      res.writeHead(200, {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'text/event-stream',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      return writeSSE(res, 'connected');
    } else {
      res.writeHead(400).end('Bad Request');
    }
  };
}

function createRequestMiddleware(
  mf: MiniOxygen,
  {
    autoReload,
    proxyServer,
    onRequest,
    onResponse,
    onResponseError,
  }: MiniOxygenServerHooks &
    Pick<MiniOxygenServerOptions, 'autoReload' | 'proxyServer'>,
): NextHandleFunction {
  return async (req, res) => {
    if (
      typeof proxyServer !== 'undefined' &&
      proxyServer !== '' &&
      !req.headers['mini-oxygen-proxy']
    ) {
      return sendProxyRequest(req, res, proxyServer!);
    }

    let response: Response;
    let status = 500;
    const headers: http.OutgoingHttpHeaders = {};

    const reqHeaders: {[key: string]: string} = {};
    // eslint-disable-next-line guard-for-in
    for (const key in req.headers) {
      const val = req.headers[key];
      if (Array.isArray(val)) {
        reqHeaders[key] = val.join(',');
      } else if (val !== undefined) {
        reqHeaders[key] = val;
      }
    }
    const request = new Request(urlFromRequest(req), {
      method: req.method,
      headers: reqHeaders,
      body:
        req.method !== 'GET' && req.method !== 'HEAD'
          ? (req as any).body
          : null,
    });

    try {
      response = await mf.dispatchFetch(request);
      status = response.status;

      for (const key of response.headers.keys()) {
        const val =
          key.toLowerCase() === 'set-cookie'
            ? (response.headers as any).getAll(key)
            : response.headers.get(key);
        headers[key] = val;
      }

      const shouldAutoreload =
        autoReload && response.headers.get('content-type') === 'text/html';

      if (shouldAutoreload) {
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          headers['content-length'] =
            parseInt(contentLength, 10) + autoReloadScriptLength;
        }
      }

      res.writeHead(status, headers);

      if (response.body) {
        for await (const chunk of response.body) {
          res.write(chunk);
        }

        if (shouldAutoreload) {
          res.write(autoReloadScript);
        }
      }

      res.end();
    } catch (err: any) {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      res.writeHead(status, {'Content-Type': 'text/plain; charset=UTF-8'});
      res.end(err.stack, 'utf8');
    }
  };
}

function sendProxyRequest(
  req: connect.IncomingMessage,
  res: http.ServerResponse,
  proxyServer: string,
) {
  const proxyRequest = new Promise(function (_resolve, reject) {
    const url = urlFromRequest(req);
    const headers = req.headers;
    headers['mini-Oxygen-Proxy'] = 'true';
    const proxyHost = proxyServer.split(':')[0];
    const proxyPort = parseInt(proxyServer.split(':')[1], 10);
    const options = {
      host: proxyHost,
      port: proxyPort,
      path: `${url.protocol}//${url.host}${url.pathname}`,
      headers,
      timeout: 3000,
    };
    const request = http.get(options, (response) => {
      const statusCode: number = response.statusCode || 0;
      res.writeHead(statusCode, response.statusMessage);
      response.pipe(res);
      return response;
    });
    request.on('timeout', () => {
      request.destroy();
      const error = new Error('connection to proxy timed out');
      reject(error);
    });
  });
  proxyRequest.catch((err: Error) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    res.writeHead(500, {'Content-Type': 'text/plain; charset=UTF-8'});
    res.end(err.stack, 'utf8');
    return res;
  });
}

export function createServer(
  mf: MiniOxygen,
  {
    assetsDir,
    publicPath,
    autoReload = false,
    proxyServer,
    ...hooks
  }: MiniOxygenServerOptions,
) {
  const app = connect();

  if (assetsDir) {
    app.use(createAssetMiddleware({assetsDir, publicPath, proxyServer}));
  }

  if (autoReload) {
    app.use(SSEUrl, createAutoReloadMiddleware(mf));
  }

  app.use(bodyParser.raw({type: '*/*'}));
  app.use(createRequestMiddleware(mf, {autoReload, proxyServer, ...hooks}));

  const server = http.createServer(app);

  return server;
}

function urlFromRequest(req: IncomingMessage) {
  const protocol = (req.socket as any).encrypted ? 'https' : 'http';
  const origin = `${protocol}://${req.headers.host ?? 'localhost'}`;
  const url = new URL(req.url ?? '', origin);

  return url;
}
