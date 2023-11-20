import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import {WebSocketServer, type WebSocket, type MessageEvent} from 'ws';
import {type Protocol} from 'devtools-protocol';
import {type InspectorWebSocketTarget} from './workerd-inspector.js';
import {request} from 'undici';

const CFW_DEVTOOLS = 'https://devtools.devprod.cloudflare.dev';
const H2_FAVICON_URL =
  'https://cdn.shopify.com/s/files/1/0598/4822/8886/files/favicon.svg';

export function createInspectorProxy(
  port: number,
  sourceFilePath: string,
  inspectorConnection?: {ws?: WebSocket},
) {
  /**
   * A unique identifier for this debugging session.
   */
  const sessionId = crypto.randomUUID();
  /**
   * WebSocket connection to the local debugger (e.g. VSCode, DevTools).
   */
  let debuggerWs: WebSocket | undefined = undefined;
  /**
   * WebSocket connection to the Workerd inspector.
   */
  let inspectorWs: WebSocket | undefined = inspectorConnection?.ws;
  /**
   * Whether the connected debugger is running in the browser (e.g. DevTools).
   */
  let isDevToolsInBrowser = false;

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Remove query params. E.g. `/json/list?for_tab`
    const [url = '/', queryString = ''] = req.url?.split('?') || [];

    switch (url) {
      // We implement a couple of well known end points
      // that are queried for metadata by chrome://inspect
      case '/json/version':
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({Browser: 'hydrogen/v2', 'Protocol-Version': '1.3'}),
        );
        break;
      case '/json':
      case '/json/list':
        {
          res.setHeader('Content-Type', 'application/json');
          const localHost = `localhost:${port}/ws`;
          const devtoolsFrontendUrl = `devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=${localHost}`;
          const devtoolsFrontendUrlCompat = `devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=${localHost}`;

          res.end(
            JSON.stringify([
              {
                id: sessionId,
                type: 'node',
                webSocketDebuggerUrl: `ws://${localHost}`,
                devtoolsFrontendUrl,
                devtoolsFrontendUrlCompat,
                // Below are fields that are visible in the DevTools UI.
                title: 'Hydrogen / Oxygen Worker',
                faviconUrl: H2_FAVICON_URL,
                url:
                  'https://' +
                  (inspectorWs ? new URL(inspectorWs.url).host : localHost),
              } satisfies InspectorWebSocketTarget,
            ]),
          );
        }
        return;
      case '/__index.js.map':
        // Handle proxied sourcemaps
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader(
          'Access-Control-Allow-Origin',
          req.headers.origin ?? 'devtools://devtools',
        );

        res.end(readFileSync(sourceFilePath + '.map', 'utf-8'));
        break;
      case '/favicon.ico':
        proxyHttp(H2_FAVICON_URL, req.headers, res);
        break;
      case '/':
        if (!queryString) {
          // Redirect to the DevTools UI with proper query params.
          res.statusCode = 302;
          res.setHeader(
            'Location',
            `/?experiments=true&v8only=true&debugger=true&ws=localhost:${port}/ws`,
          );
          res.end();
        } else {
          // Proxy CFW DevTools UI.
          proxyHttp(
            CFW_DEVTOOLS + '/js_app',
            req.headers,
            res,
            (content) =>
              // HTML from DevTools comes without closing <body> and <html> tags.
              // The browser closes them automatically, then modifies the DOM with JS.
              // This adds a loading indicator before the JS kicks in and modifies the DOM.
              content +
              '<div style="display: flex; flex-direction: column; align-items: center; padding-top: 20px; font-family: Arial; color: white">Loading DevTools...</div>' +
              '</body></html>',
          );
        }
        break;
      default:
        if (
          url === '/panels/sources/sources-meta.js' ||
          (url.startsWith('/core/i18n/locales/') && url.endsWith('.json'))
        ) {
          // Replace tab names in the sources section. Locales might
          // overwrite the original name, so we modify them too.
          proxyHttp(CFW_DEVTOOLS + url, req.headers, res, (content) =>
            content.replace(/['"]Cloudflare['"]/g, '"Hydrogen"'),
          );
        } else {
          // Proxy all other assets to the CFW DevTools CDN.
          proxyHttp(CFW_DEVTOOLS + url, req.headers, res);
        }

        break;
    }
  });

  const wsServer = new WebSocketServer({server, clientTracking: true});
  server.listen(port);

  /**
   * Buffer inspector messages when there is no debugger connected.
   * (e.g. initial console logs, etc.).
   */
  let messageBuffer: MessageEvent[] = [];

  wsServer.on('connection', (ws, req) => {
    if (wsServer.clients.size > 1) {
      // Only support one active Devtools instance at a time.
      console.error(
        'Tried to open a new devtools window when a previous one was already open.',
      );

      ws.close(1013, 'Too many clients; only one can be connected at a time');
    } else {
      // Ensure debugger is restarted in workerd before connecting
      // a new client to receive `Debugger.scriptParsed` events.
      inspectorWs?.send(
        JSON.stringify({id: 100_000_000, method: 'Debugger.disable'}),
      );

      debuggerWs?.removeEventListener('message', sendMessageToInspector);
      debuggerWs = ws;

      // This user-agent is, so far, unique to DevTools in the browser.
      isDevToolsInBrowser = /mozilla/i.test(req.headers['user-agent'] ?? '');

      debuggerWs.addEventListener('message', sendMessageToInspector);
      debuggerWs.addEventListener('close', () => {
        debuggerWs?.removeEventListener('message', sendMessageToInspector);
        debuggerWs = undefined;
      });

      // Flush any buffered messages
      messageBuffer.forEach(sendMessageToDebugger);
      messageBuffer = [];
    }
  });

  if (inspectorWs) onInspectorConnection();

  function onInspectorConnection() {
    inspectorWs?.addEventListener('message', sendMessageToDebugger);

    // In case this is a DevTools connection, send a warning
    // message to the console to inform about reconnection.
    // VSCode can reconnect automatically with `restart: true`.
    debuggerWs?.send(
      JSON.stringify({
        method: 'Runtime.consoleAPICalled',
        params: {
          type: 'warning',
          args: [
            {
              type: 'string',
              value:
                'Source code changed. Please reload the DevTools to reconnect the debugger.',
            },
          ],
          executionContextId: Date.now(),
          timestamp: Date.now(),
        } satisfies Protocol.Runtime.ConsoleAPICalledEvent,
      }),
    );

    debuggerWs?.close(1001, 'Source code changed');
  }

  function sendMessageToInspector(event: MessageEvent) {
    inspectorWs?.send(event.data);
  }

  function sendMessageToDebugger(event: MessageEvent) {
    // Intercept Debugger.scriptParsed responses to inject URL schemes
    // so that DevTools can fetch source maps from the proxy server.
    // This is only required when opening DevTools in the browser.
    if (isDevToolsInBrowser) {
      const message = JSON.parse(event.data as string);
      if (
        message.method === 'Debugger.scriptParsed' &&
        message.params.sourceMapURL === 'index.js.map'
      ) {
        // The browser can't download source maps from file:// URLs due to security restrictions.
        // Force the DevTools to fetch the source map using http:// instead of file://
        // This endpoint is handled in our proxy server above.
        message.params.sourceMapURL = `http://localhost:${port}/__index.js.map`;
        event = {...event, data: JSON.stringify(message)};
      }
    }

    if (debuggerWs) {
      debuggerWs.send(event.data);
    } else {
      messageBuffer.push(event);
    }
  }

  return {
    updateInspectorConnection(newConnection?: {ws?: WebSocket}) {
      inspectorWs = newConnection?.ws;
      onInspectorConnection();
    },
  };
}

function proxyHttp(
  url: string,
  originalHeaders: IncomingMessage['headers'],
  nodeResponse: ServerResponse,
  contentReplacer?: (content: string) => string,
) {
  const headers = Object.fromEntries(Object.entries(originalHeaders));
  delete headers['host'];
  delete headers['cookie'];
  // If the response is going to be awaited and modified,
  // we can't ask for an encoded response (we can't decode it here).
  if (contentReplacer) delete headers['accept-encoding'];

  // Use `request` instead of `fetch` to avoid decompressing
  // the response body. We want to forward the raw response.
  // https://github.com/nodejs/undici/issues/1462
  return request(url, {responseHeader: 'raw', headers})
    .then((response) => {
      nodeResponse.statusCode = response.statusCode;
      if (nodeResponse.statusCode === 404) {
        return nodeResponse.end('Not found');
      }

      Object.entries(response.headers).forEach(([key, value]) => {
        if (value) {
          nodeResponse.setHeader(key, value);
        }
      });

      if (contentReplacer) {
        return response.body
          ?.text()
          .then(contentReplacer)
          .then(nodeResponse.end.bind(nodeResponse));
      }

      return response.body.pipe(nodeResponse);
    })
    .catch((err) => {
      console.error(err);
      nodeResponse.statusCode = 500;
      nodeResponse.end('Internal error');
    });
}
