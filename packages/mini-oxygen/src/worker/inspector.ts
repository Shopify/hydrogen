/**
 * Huge part of this code comes from Wrangler:
 * https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/inspect.ts
 */

import {fetch} from 'miniflare';
import {WebSocket} from 'ws';
import type {Protocol} from 'devtools-protocol';
import {createInspectorProxy, type InspectorProxy} from './devtools.js';

// https://chromedevtools.github.io/devtools-protocol/#endpoints
export interface InspectorWebSocketTarget {
  id: string;
  title: string;
  type: 'node';
  description?: string;
  webSocketDebuggerUrl: string;
  devtoolsFrontendUrl: string;
  devtoolsFrontendUrlCompat: string;
  faviconUrl: string;
  url: string;
}

export type MessageData = {id: number; result: unknown} & (
  | {
      method: 'Debugger.scriptParsed';
      params: Protocol.Debugger.ScriptParsedEvent;
    }
  | {
      method: 'Runtime.consoleAPICalled';
      params: Protocol.Runtime.ConsoleAPICalledEvent;
    }
  | {
      method: 'Runtime.exceptionThrown';
      params: Protocol.Runtime.ExceptionThrownEvent;
    }
);

/**
 * Creates a connection to the workerd inspector.
 *
 * The messages are sent via WebSockets following the Chrome DevTools Protocol:
 * https://chromedevtools.github.io/devtools-protocol/
 *
 * Originally, the inspector connection served for ingesting logs (e.g. user's `console.log`)
 * from workerd into the main Node.js process, so that they could be displayed
 * in the terminal. However, after Miniflare added support for log streaming,
 * the inspector connection is now only used for attaching debuggers.
 *
 * @param options - Options for the inspector.
 * @returns A function to reconnect to the inspector.
 */
export function createInspectorConnector(options: {
  privateInspectorPort: number;
  publicInspectorPort: number;
  sourceMapPath: string;
  workerName: string;
}) {
  let inspectorUrl: string | undefined;
  let inspectorConnection: InspectorConnection | undefined;
  let inspectorProxy: InspectorProxy | undefined;

  return async (onBeforeConnect?: () => void | Promise<void>) => {
    inspectorConnection?.close();

    inspectorUrl ??= await findInspectorUrl(
      options.privateInspectorPort,
      options.workerName,
    );

    await onBeforeConnect?.();

    inspectorConnection = connectToInspector({
      inspectorUrl,
      sourceMapPath: options.sourceMapPath,
    });

    if (inspectorProxy) {
      inspectorProxy.updateInspectorConnection(inspectorConnection);
    } else {
      inspectorProxy = createInspectorProxy(
        options.publicInspectorPort,
        inspectorConnection,
      );
    }
  };
}

/**
 * Since a workerd instance can have multiple workers, we need to find the
 * inspector URL for the main worker that runs user code, since that's the
 * worker we want to debug. We use the port number to query all the existing
 * workers and find the one that matches the user worker name.
 */
async function findInspectorUrl(inspectorPort: number, workerName: string) {
  try {
    // Fetch the inspector JSON response from the DevTools Inspector protocol
    // https://chromedevtools.github.io/devtools-protocol/#endpoints
    const jsonUrl = `http://127.0.0.1:${inspectorPort}/json`;
    const body = (await (
      await fetch(jsonUrl)
    ).json()) as InspectorWebSocketTarget[];

    const url = body?.find(
      ({id}) => id === `core:user:${workerName}`,
    )?.webSocketDebuggerUrl;

    if (!url) {
      throw new Error('Unable to find inspector URL');
    }

    return url;
  } catch (error: any) {
    const message =
      'Unable to connect to Worker inspector. Please report this issue.';

    if (!error || !error.message) {
      error = new Error(message);
    } else {
      error.message = message + '\n' + error.message;
    }

    throw error;
  }
}

export type InspectorConnection = ReturnType<typeof connectToInspector>;

interface InspectorOptions {
  /**
   * The websocket URL exposed by Workers that the inspector should connect to.
   */
  inspectorUrl: string;
  /**
   * Sourcemap path, so that stacktraces can be interpretted
   */
  sourceMapPath?: string | undefined;
}

function connectToInspector({inspectorUrl, sourceMapPath}: InspectorOptions) {
  /**
   * A simple decrementing id to attach to messages sent to DevTools.
   * Use negative ids to void collisions with DevTools messages.
   */
  const messageCounterRef = {value: -1};
  const getMessageId = () => messageCounterRef.value--;
  const pendingMessages = new Map<number, (result: unknown) => void>();
  const ws = new WebSocket(inspectorUrl);

  /**
   * A handle to the interval we run to keep the websocket alive
   */
  let keepAliveInterval: NodeJS.Timeout;

  /**
   * Test if the websocket is closed
   */
  const isClosed = () =>
    ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING;

  /**
   * Send a message to the remote websocket
   */
  const send = <Request = unknown, Response = unknown>(
    method: string,
    params?: Request,
  ) => {
    if (!isClosed()) {
      const id = getMessageId();

      let promiseResolve: ((result: Response) => void) | undefined = undefined;
      const promise = new Promise<Response>(
        (resolve) => (promiseResolve = resolve),
      );

      pendingMessages.set(id, promiseResolve as any);
      ws.send(JSON.stringify({id, method, params}));
      return promise;
    }

    return Promise.resolve(undefined);
  };

  ws.once('open', () => {
    send('Runtime.enable');

    // Keep the websocket alive by sending a message every 10 seconds
    keepAliveInterval = setInterval(() => send('Runtime.getIsolateId'), 10_000);
  });

  ws.on('unexpected-response', () => {
    console.log('Waiting for connection...');
  });

  ws.once('close', () => {
    clearInterval(keepAliveInterval);
  });

  return {
    ws,
    send,
    sourceMapPath,
    isClosed,
    close: () => {
      clearInterval(keepAliveInterval);

      if (!isClosed()) {
        try {
          ws.removeAllListeners();
          ws.close();
        } catch (err) {
          // Closing before the websocket is ready will throw an error.
        }
      }
    },
  };
}
