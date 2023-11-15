import crypto from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import {WebSocketServer, type WebSocket, type MessageEvent} from 'ws';
import {type Protocol} from 'devtools-protocol';
import {type InspectorWebSocketTarget} from './workerd-inspector.js';

export function createInspectorProxy(
  port: number,
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

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Remove query params. E.g. `/json/list?for_tab`
    const url = req.url?.split('?')[0] ?? '';

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
                faviconUrl:
                  'https://cdn.shopify.com/s/files/1/0598/4822/8886/files/favicon.svg',
                url:
                  'https://' +
                  (inspectorWs ? new URL(inspectorWs.url).host : localHost),
              } satisfies InspectorWebSocketTarget,
            ]),
          );
        }
        return;
      default:
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
