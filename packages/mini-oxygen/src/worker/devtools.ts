import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import {WebSocketServer, type WebSocket, type MessageEvent} from 'ws';
import type {Protocol} from 'devtools-protocol';
import {request} from 'undici';
import type {
  MessageData,
  InspectorWebSocketTarget,
  InspectorConnection,
} from './inspector.js';
import {extractConsoleMessages} from './stdio.js';

const CFW_DEVTOOLS = 'https://devtools.devprod.cloudflare.dev';
const FAVICON_URL =
  'https://cdn.shopify.com/s/files/1/0598/4822/8886/files/favicon.svg';

export type InspectorProxy = ReturnType<typeof createInspectorProxy>;

/**
 * Creates a proxy server that forwards messages between the local
 * debugger (e.g. VSCode, Browser DevTools) and the Workerd inspector.
 * It also serves a custom in-browser DevTools UI for MiniOxygen by
 * proxying the Cloudflare DevTools (used in Wrangler / Miniflare),
 * and fixes a few issues related to serving this tool locally.
 *
 */
export function createInspectorProxy(
  port: number,
  newInspectorConnection: InspectorConnection,
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
   * Workerd inspector connection.
   */
  let inspector = newInspectorConnection;
  /**
   * Whether the connected debugger is running in the browser (e.g. DevTools).
   */
  let isDevToolsInBrowser = false;

  const sourceMapPath = newInspectorConnection.sourceMapPath;
  const sourceMapPathname = '/__index.js.map';
  const sourceMapURL = `http://localhost:${port}${sourceMapPathname}`;

  // Create the proxy server used when running with `--debug` flag:
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Remove query params. E.g. `/json/list?for_tab`
    const [url = '/', queryString = ''] = req.url?.split('?') || [];

    switch (url) {
      // We implement a couple of well known end points that are queried
      // for metadata when opening `chrome://inspect` in the browser.
      // https://chromedevtools.github.io/devtools-protocol/#endpoints
      case '/json/version':
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({Browser: 'MiniOxygen', 'Protocol-Version': '1.3'}),
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
                title: 'MiniOxygen Worker',
                faviconUrl: FAVICON_URL,
                url: 'https://' + new URL(inspector.ws.url).host,
              } satisfies InspectorWebSocketTarget,
            ]),
          );
        }
        return;
      case sourceMapPathname:
        // Handle proxied sourcemaps. This is only used when serving
        // a built application in h2:preview or classic project dev.
        // h2:dev with Vite uses inlined sourcemaps instead.
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader(
          'Access-Control-Allow-Origin',
          req.headers.origin ?? 'devtools://devtools',
        );

        if (sourceMapPath) {
          res.end(readFileSync(sourceMapPath, 'utf-8'));
        } else {
          res.statusCode = 404;
          res.end();
        }
        break;
      case '/favicon.ico':
        // The browser requests for this automatically when opening DevTools.
        proxyHttp(FAVICON_URL, req.headers, res);
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
          // Proxy the main page of the original CFW DevTools UI.
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
        // Proxy assets from the original CFW DevTools UI, modifying them as needed.
        if (
          url === '/panels/sources/sources-meta.js' ||
          (url.startsWith('/core/i18n/locales/') && url.endsWith('.json'))
        ) {
          // Replace tab names in the sources section. Locales might
          // overwrite the original name, so we modify them too.
          proxyHttp(CFW_DEVTOOLS + url, req.headers, res, (content) =>
            content.replace(/['"]Cloudflare['"]/g, '"MiniOxygen"'),
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
      // Only support one active DevTools instance at a time. E.g.
      // either VSCode/editor debugger or 1 browser DevTools tab.
      console.error(
        'Tried to open a new devtools window when a previous one was already open.',
      );

      ws.close(1013, 'Too many clients; only one can be connected at a time');
    } else {
      // Ensure debugger is restarted in workerd before connecting
      // a new client to receive `Debugger.scriptParsed` events.
      inspector.ws.send(
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

  if (inspector.ws) onInspectorConnection();

  /**
   * This function is called when the inspector connection is established
   * for the first time or when the inspector is reconnected. That happens
   * when the source code is reloaded in h2:preview, h2:debug:cpu.
   * However, it no longer happens in h2:dev with Vite because the worker
   * instance is not reloaded after source code changes, only patched with HMR.
   */
  function onInspectorConnection() {
    inspector.ws.addEventListener('message', sendMessageToDebugger);

    // In case this is a DevTools connection, send a warning
    // message to the console to inform about reconnection.
    // VSCode can reconnect automatically with `restart: true`.
    //  > TODO: it would be good to send this message also in h2:dev with Vite.
    //  > However, that requires a completely different type of wiring:
    //  > Getting Vite's HMR notifications from this part of the code somehow.
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
    inspector.ws.send(event.data);
  }

  function sendMessageToDebugger(event: MessageEvent) {
    if (isDevToolsInBrowser) {
      event = enhanceDevToolsEvent(event, sourceMapURL);
    }

    if (debuggerWs) {
      debuggerWs.send(event.data);
    } else {
      messageBuffer.push(event);
    }
  }

  return {
    // Every time workerd is restarted (e.g. env var change, etc.),
    // the inspector connection needs to be re-established.
    updateInspectorConnection(newConnection: InspectorConnection) {
      inspector = newConnection;
      onInspectorConnection();
    },
  };
}

function enhanceDevToolsEvent(event: MessageEvent, sourceMapUrl: string) {
  const message = JSON.parse(event.data as string) as MessageData;

  if (message.method === 'Debugger.scriptParsed') {
    // Intercept Debugger.scriptParsed responses to inject URL schemes
    // so that DevTools can fetch source maps from the proxy server.
    // This is only required when opening DevTools in the browser.
    if (message.params.sourceMapURL === 'index.js.map') {
      // The browser can't download source maps from file:// URLs due to security restrictions.
      // Force the DevTools to fetch the source map using http:// instead of file://
      // This endpoint is handled in our proxy server above.
      message.params.sourceMapURL = sourceMapUrl;
    }
  }

  if (message.method === 'Runtime.consoleAPICalled') {
    // Remove injected console suffixes from messages sent to the browser.
    message.params.args.forEach((arg) => {
      if (typeof arg.value === 'string') {
        const [[, normalizedValue]] = extractConsoleMessages(arg.value);
        arg.value = normalizedValue;
      }
    });
  }

  return {...event, data: JSON.stringify(message)};
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
  // Using raw `node:https` is problematic in Apple Silicon
  // and throws "getaddrinfo ENOTFOUND" errors when performing
  // many requests in parallel. Probably related to this:
  // https://github.com/orgs/nodejs/discussions/49734
  // Also, undici is faster and more efficient than `node:https`.
  return request(url, {responseHeader: 'raw', headers})
    .then((response) => {
      nodeResponse.writeHead(response.statusCode, response.headers);

      if (nodeResponse.statusCode >= 300) {
        nodeResponse.end();
        return;
      }

      if (contentReplacer) {
        response.body
          .text()
          .then(contentReplacer)
          .then(nodeResponse.end.bind(nodeResponse));
      } else {
        response.body.pipe(nodeResponse);
      }
    })
    .catch((err) => {
      console.error(err);
      nodeResponse.statusCode = 500;
      nodeResponse.end('Internal error');
    });
}
