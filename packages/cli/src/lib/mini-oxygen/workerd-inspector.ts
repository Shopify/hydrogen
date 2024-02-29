/**
 * Huge part of this code comes from Wrangler:
 * https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/inspect.ts
 */

import {dirname} from 'node:path';
import {readFile} from 'node:fs/promises';
import {fetch} from '@shopify/cli-kit/node/http';
import {SourceMapConsumer} from 'source-map';
import {WebSocket} from 'ws';
import {type Protocol} from 'devtools-protocol';
import {
  addInspectorConsoleLogger,
  formatStack,
} from './workerd-inspector-logs.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  createInspectorProxy,
  type InspectorProxy,
} from './workerd-inspector-proxy.js';

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

export interface ErrorProperties {
  message?: string;
  cause?: unknown;
  stack?: string;
}

export function createInspectorConnector(options: {
  privateInspectorPort: number;
  publicInspectorPort: number;
  absoluteBundlePath: string;
  sourceMapPath: string;
  debug: boolean;
}) {
  let inspectorUrl: string | undefined;
  let inspectorConnection: InspectorConnection | undefined;
  let inspectorProxy: InspectorProxy | undefined;

  return async (onBeforeConnect?: () => void | Promise<void>) => {
    inspectorConnection?.close();

    inspectorUrl ??= await findInspectorUrl(options.privateInspectorPort);

    await onBeforeConnect?.();

    inspectorConnection = connectToInspector({
      inspectorUrl,
      sourceMapPath: options.sourceMapPath,
    });

    addInspectorConsoleLogger(inspectorConnection);

    if (options.debug) {
      if (inspectorProxy) {
        inspectorProxy.updateInspectorConnection(inspectorConnection);
      } else {
        inspectorProxy = createInspectorProxy(
          options.publicInspectorPort,
          options.absoluteBundlePath,
          inspectorConnection,
        );
      }
    }
  };
}

async function findInspectorUrl(inspectorPort: number) {
  try {
    // Fetch the inspector JSON response from the DevTools Inspector protocol
    const jsonUrl = `http://127.0.0.1:${inspectorPort}/json`;
    const body = (await (
      await fetch(jsonUrl)
    ).json()) as InspectorWebSocketTarget[];

    const url = body?.find(
      ({id}) => id === 'core:user:hydrogen' || id === 'core:user:oxygen',
    )?.webSocketDebuggerUrl;

    if (!url) {
      throw new Error('Unable to find inspector URL');
    }

    return url;
  } catch (error: unknown) {
    const abortError = new AbortError(
      'Unable to connect to Worker inspector',
      `Please report this issue. ${(error as Error).stack}`,
    );

    abortError.stack = (error as Error).stack;
    throw abortError;
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

  const cleanupMessageQueue = (data: {id: number; result: unknown}) => {
    try {
      if (data?.id < 0) {
        // We only use negative IDs for internal messages
        const resolve = pendingMessages.get(data.id);
        if (resolve !== undefined) {
          pendingMessages.delete(data.id);
          resolve(data.result);
        }

        return true;
      }
    } catch (error) {
      console.error(error);
    }

    return false;
  };

  function getPropertyValue(
    name: string,
    response?: Protocol.Runtime.GetPropertiesResponse,
  ) {
    return response?.result.find((prop) => prop.name === name)?.value;
  }

  async function reconstructError(
    initialProperties: ErrorProperties,
    ro?: Protocol.Runtime.RemoteObject,
  ) {
    let errorProperties = {...initialProperties};

    // The two requests here are based on intercepted messages sent by
    // the DevTools frontend to view the stack.
    const objectId = ro?.objectId;

    if (objectId) {
      // Get all properties
      const [sourceMapConsumer, getPropertiesResponse] = await Promise.all([
        getSourceMapConsumer(),
        send<
          Protocol.Runtime.GetPropertiesRequest,
          Protocol.Runtime.GetPropertiesResponse
        >('Runtime.getProperties', {
          objectId,
          ownProperties: false,
          accessorPropertiesOnly: false,
          generatePreview: false,
          nonIndexedPropertiesOnly: false,
        }),
      ]);

      const message = getPropertyValue('message', getPropertiesResponse);
      if (message?.value) {
        errorProperties.message = message.value;
      }

      const stack = getPropertyValue('stack', getPropertiesResponse);
      if (stack?.value) {
        errorProperties.stack = sourceMapConsumer
          ? formatStack(sourceMapConsumer, stack.value)
          : stack.value;
      }

      // If this error has a `cause` property, display it
      const cause = getPropertyValue('cause', getPropertiesResponse);
      if (cause) {
        errorProperties.cause = cause.description ?? cause.value;

        if (
          cause.subtype === 'error' &&
          sourceMapConsumer &&
          cause.description !== undefined
        ) {
          errorProperties.stack = formatStack(
            sourceMapConsumer,
            cause.description,
          );
        }
      }

      // `DOMException`s are special, the actually useful stack trace
      // is hidden behind the `stack` getter, and not included in the
      // preview: https://github.com/cloudflare/workerd/blob/1b5057f2bfcfedf146f6f79ff04e99903d55412b/src/workerd/jsg/dom-exception.h#L92
      const isDomException = ro?.className === 'DOMException';

      if (isDomException) {
        // If this is a `DOMException`, get a reference to `stack`
        const stackDescriptor = getPropertiesResponse?.result.find(
          (prop) => prop.name === 'stack',
        );
        const getObjectId = stackDescriptor?.get?.objectId;
        if (getObjectId !== undefined) {
          // Invoke the `stack` getter
          const callFunctionResponse = await send<
            Protocol.Runtime.CallFunctionOnRequest,
            Protocol.Runtime.CallFunctionOnResponse
          >('Runtime.callFunctionOn', {
            objectId,
            functionDeclaration:
              'function invokeGetter(getter) { return Reflect.apply(getter, this, []); }',
            arguments: [{objectId: getObjectId}],
            silent: true,
          });

          if (callFunctionResponse !== undefined) {
            // Log the source-mapped `stack` if we have a consumer
            const stack: unknown = callFunctionResponse.result.value;
            if (typeof stack === 'string' && sourceMapConsumer !== undefined) {
              errorProperties.stack = formatStack(sourceMapConsumer, stack);
            } else {
              try {
                errorProperties.stack = JSON.stringify(stack);
              } catch {}
            }
          }
        }
      }
    }

    const error = new Error(errorProperties.message);
    error.stack = errorProperties.stack;
    if (errorProperties.cause) {
      error.cause = errorProperties.cause;
    }

    return error;
  }

  // Parse the source-map lazily when required, then store it, so we can we
  // reuse the consumer for different errors without having to parse the map
  // each time. Consumers must be destroyed when no longer needed, so create
  // an abort controller aborted to signal destruction.
  const sourceMapAbortController = new AbortController();
  let sourceMapConsumerPromise: Promise<SourceMapConsumer | undefined>;
  const getSourceMapConsumer = () => {
    return (sourceMapConsumerPromise ??= (async () => {
      // If we don't have a source map, or we've aborted, skip source mapping
      if (!sourceMapPath || sourceMapAbortController.signal.aborted) {
        return;
      }

      try {
        // Load and parse the source map
        const mapContent = await readFile(sourceMapPath, 'utf-8');
        if (sourceMapAbortController.signal.aborted) return;
        const map = JSON.parse(mapContent);
        map.sourceRoot = dirname(sourceMapPath);

        // `new SourceMapConsumer(...)` returns a `Promise<SourceMapConsumer>`
        const sourceMapConsumer = await new SourceMapConsumer(map);
        if (sourceMapAbortController.signal.aborted) {
          sourceMapConsumer.destroy();
          return;
        }

        sourceMapAbortController.signal.addEventListener('abort', () => {
          sourceMapConsumerPromise = Promise.resolve(undefined);
          sourceMapConsumer.destroy();
        });
        return sourceMapConsumer;
      } catch {}
    })());
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
    sourceMapAbortController.abort();
  });

  return {
    ws,
    send,
    reconstructError,
    getSourceMapConsumer,
    cleanupMessageQueue,
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

      sourceMapAbortController.abort();
    },
  };
}
