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

import type {MiniOxygen} from './core.js';

export type {Request, Response} from '@miniflare/core';

export interface MiniOxygenServerHooks {
  onRequest?: (request: Request) => void | Promise<void>;
  onResponse?: (request: Request, response: Response) => void | Promise<void>;
  onResponseError?: (request: Request, error: unknown) => void;
}

// https://shopify.dev/docs/custom-storefronts/oxygen/worker-runtime-apis#custom-headers
const OXYGEN_HEADERS_MAP = {
  ip: {name: 'oxygen-buyer-ip', defaultValue: '127.0.0.1'},
  longitude: {name: 'oxygen-buyer-longitude', defaultValue: '-122.40140'},
  latitude: {name: 'oxygen-buyer-latitude', defaultValue: '37.78855'},
  continent: {name: 'oxygen-buyer-continent', defaultValue: 'NA'},
  country: {name: 'oxygen-buyer-country', defaultValue: 'US'},
  region: {name: 'oxygen-buyer-region', defaultValue: 'California'},
  regionCode: {name: 'oxygen-buyer-region-code', defaultValue: 'CA'},
  city: {name: 'oxygen-buyer-city', defaultValue: 'San Francisco'},
  isEuCountry: {name: 'oxygen-buyer-is-eu-country', defaultValue: ''},
  timezone: {
    name: 'oxygen-buyer-timezone',
    defaultValue: 'America/Los_Angeles',
  },

  // Not documented but available in Oxygen:
  deploymentId: {name: 'oxygen-buyer-deployment-id', defaultValue: 'local'},
  shopId: {name: 'oxygen-buyer-shop-id', defaultValue: 'development'},
  storefrontId: {
    name: 'oxygen-buyer-storefront-id',
    defaultValue: 'development',
  },
} as const;

type OxygenHeaderParams = keyof typeof OXYGEN_HEADERS_MAP;

export interface MiniOxygenServerOptions extends MiniOxygenServerHooks {
  assetsDir?: string;
  autoReload?: boolean;
  publicPath?: string;
  proxyServer?: string;
  oxygenHeaders?: Partial<{[key in OxygenHeaderParams]: string}>;
}

const SSEUrl = '/__minioxygen_events';
const autoReloadScriptTemplate = `<script defer type="application/javascript">
(function () {
  // MiniOxygen Auto Reload
  var source = new EventSource('${SSEUrl}');
  source.addEventListener('open', function(e) { console.log('Auto Reload Enabled') }, false);
  source.onmessage = function(e) { if (e.data === 'connected') {console.log('Listening for events...');} else if (e.data === 'reload') {location.reload();} };
})();
</script>`;

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

    if (shouldProxy(req, proxyServer)) {
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
    oxygenHeaders,
    onRequest,
    onResponse,
    onResponseError,
  }: Omit<MiniOxygenServerOptions, 'publicPath' | 'assetsDir'>,
): NextHandleFunction {
  return async (req, res) => {
    if (shouldProxy(req, proxyServer)) {
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

    for (const [key, {name, defaultValue}] of Object.entries(
      OXYGEN_HEADERS_MAP,
    )) {
      if (!reqHeaders[name]) {
        reqHeaders[name] =
          oxygenHeaders?.[key as OxygenHeaderParams] ?? defaultValue;
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
      if (onRequest) await onRequest(request);
      response = await mf.dispatchFetch(request);
      if (onResponse) await onResponse(request, response as Response);
      status = response.status;

      for (const key of response.headers.keys()) {
        const val =
          key.toLowerCase() === 'set-cookie'
            ? (response.headers as any).getAll(key)
            : response.headers.get(key);
        headers[key] = val;
      }

      let autoReloadScript = autoReloadScriptTemplate;

      const shouldAutoreload =
        autoReload && response.headers.get('content-type') === 'text/html';

      if (shouldAutoreload) {
        const csp = response.headers.get('content-security-policy');
        if (csp) {
          const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
          if (nonce) {
            autoReloadScript = autoReloadScript.replace(
              '<script',
              `$& nonce="${nonce}"`,
            );
          }
        }

        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          headers['content-length'] =
            parseInt(contentLength, 10) + Buffer.byteLength(autoReloadScript);
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
      onResponseError?.(request, err as Error);
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
    const options = {
      host: proxyServer.split(':')[0],
      port: parseInt(proxyServer.split(':')[1], 10),
      path: `${url.protocol}//${url.host}${url.pathname}`,
      headers: {
        ...req.headers,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'mini-Oxygen-Proxy': 'true',
      },
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
    ...rest
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
  app.use(createRequestMiddleware(mf, {autoReload, proxyServer, ...rest}));

  const server = http.createServer(app);

  return server;
}

function urlFromRequest(req: IncomingMessage) {
  const protocol = (req.socket as any).encrypted ? 'https' : 'http';
  const origin = `${protocol}://${req.headers.host ?? 'localhost'}`;
  const url = new URL(req.url ?? '', origin);

  return url;
}

function shouldProxy(req: IncomingMessage, proxyServer: string | undefined) {
  return (
    typeof proxyServer !== 'undefined' &&
    proxyServer !== '' &&
    !req.headers['mini-oxygen-proxy']
  );
}
