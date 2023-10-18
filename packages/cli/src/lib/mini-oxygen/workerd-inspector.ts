/**
 * Huge part of this code comes from Wrangler:
 * https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/inspect.ts
 */

import {dirname} from 'node:path';
import {readFile} from 'node:fs/promises';
import {SourceMapConsumer} from 'source-map';
import {parse as parseStackTrace} from 'stack-trace';
import WebSocket, {type MessageEvent} from 'ws';
import {Protocol} from 'devtools-protocol';

// https://chromedevtools.github.io/devtools-protocol/#endpoints
interface InspectorWebSocketTarget {
  id: string;
  title: string;
  type: 'node';
  description: string;
  webSocketDebuggerUrl: string;
  devtoolsFrontendUrl: string;
  devtoolsFrontendUrlCompat: string;
  faviconUrl: string;
  url: string;
}

export async function findInspectorUrl(inspectorPort: number) {
  try {
    // Fetch the inspector JSON response from the DevTools Inspector protocol
    const jsonUrl = `http://127.0.0.1:${inspectorPort}/json`;
    const body = (await (
      await fetch(jsonUrl)
    ).json()) as InspectorWebSocketTarget[];

    return body?.find(({id}) => id === 'core:user:hydrogen')
      ?.webSocketDebuggerUrl;
  } catch (error: unknown) {
    console.error('Error attempting to retrieve debugger URL:', error);
  }
}

interface InspectorProps {
  /**
   * The websocket URL exposed by Workers that the inspector should connect to.
   */
  inspectorUrl: string;
  /**
   * Sourcemap path, so that stacktraces can be interpretted
   */
  sourceMapPath?: string | undefined;
}

interface ErrorProperties {
  message?: string;
  cause?: unknown;
  stack?: string;
}

export function connectToInspector({
  inspectorUrl,
  sourceMapPath,
}: InspectorProps) {
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

  ws.addEventListener('message', async (event: MessageEvent) => {
    if (typeof event.data === 'string') {
      const evt = JSON.parse(event.data);
      cleanupMessageQueue(evt);

      if (evt.method === 'Runtime.exceptionThrown') {
        const params = evt.params as Protocol.Runtime.ExceptionThrownEvent;

        const errorProperties: ErrorProperties = {};

        const sourceMapConsumer = await getSourceMapConsumer();
        if (sourceMapConsumer !== undefined) {
          // Create the lines for the exception details log
          const message =
            params.exceptionDetails.exception?.description?.split('\n')[0];
          const stack = params.exceptionDetails.stackTrace?.callFrames;
          const formatted = formatStructuredError(
            sourceMapConsumer,
            message,
            stack,
          );

          errorProperties.message = params.exceptionDetails.text;
          errorProperties.stack = formatted;
        } else {
          errorProperties.message =
            params.exceptionDetails.text +
            ' ' +
            (params.exceptionDetails.exception?.description ?? '');
        }

        console.error(
          await reconstructError(
            errorProperties,
            params.exceptionDetails.exception,
          ),
        );
      }

      if (evt.method === 'Runtime.consoleAPICalled') {
        const params = evt.params as Protocol.Runtime.ConsoleAPICalledEvent;
        await logConsoleMessage(params, reconstructError);
      }
    } else {
      // We should never get here, but who know is 2022...
      console.error('Unrecognised devtools event:', event);
    }
  });

  ws.once('open', () => {
    send('Runtime.enable');
    // TODO: Why does this need a timeout?
    // setTimeout(() => send('Network.enable'), 2000);

    keepAliveInterval = setInterval(() => send('Runtime.getIsolateId'), 10_000);
  });

  ws.on('unexpected-response', () => {
    console.log('Waiting for connection...');
    /**
     * This usually means the worker is not "ready" yet
     * so we'll just retry the connection process
     */
    //   retryRemoteWebSocketConnection();
  });

  ws.once('close', () => {
    clearInterval(keepAliveInterval);
    sourceMapAbortController.abort();
  });

  return () => {
    clearInterval(keepAliveInterval);

    if (!isClosed()) {
      try {
        ws.close();
      } catch (err) {
        // Closing before the websocket is ready will throw an error.
      }
    }

    sourceMapAbortController.abort();
  };
}

/**
 * This function converts a message serialised as a devtools event
 * into arguments suitable to be called by a console method, and
 * then actually calls the method with those arguments. Effectively,
 * we're just doing a little bit of the work of the devtools console,
 * directly in the terminal.
 */

export const mapConsoleAPIMessageTypeToConsoleMethod: {
  [key in Protocol.Runtime.ConsoleAPICalledEvent['type']]: Exclude<
    keyof Console,
    'Console'
  >;
} = {
  log: 'log',
  debug: 'debug',
  info: 'info',
  warning: 'warn',
  error: 'error',
  dir: 'dir',
  dirxml: 'dirxml',
  table: 'table',
  trace: 'trace',
  clear: 'clear',
  count: 'count',
  assert: 'assert',
  profile: 'profile',
  profileEnd: 'profileEnd',
  timeEnd: 'timeEnd',
  startGroup: 'group',
  startGroupCollapsed: 'groupCollapsed',
  endGroup: 'groupEnd',
};

async function logConsoleMessage(
  evt: Protocol.Runtime.ConsoleAPICalledEvent,
  reconstructError: (
    initialProperties: ErrorProperties,
    ro: Protocol.Runtime.RemoteObject,
  ) => Promise<Error>,
) {
  const args: Array<string | Error> = [];
  for (const ro of evt.args) {
    switch (ro.type) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'undefined':
      case 'symbol':
      case 'bigint':
        args.push(ro.value);
        break;
      case 'function':
        args.push(`[Function: ${ro.description ?? '<no-description>'}]`);
        break;
      case 'object':
        if (!ro.preview) {
          args.push(
            ro.subtype === 'null'
              ? 'null'
              : ro.description ?? '<no-description>',
          );
        } else {
          if (ro.preview.description) args.push(ro.preview.description);

          switch (ro.preview.subtype) {
            case 'array':
              args.push(
                '[ ' +
                  ro.preview.properties
                    .map(({value}) => {
                      return value;
                    })
                    .join(', ') +
                  (ro.preview.overflow ? '...' : '') +
                  ' ]',
              );

              break;
            case 'weakmap':
            case 'map':
              ro.preview.entries === undefined
                ? args.push('{}')
                : args.push(
                    '{\n' +
                      ro.preview.entries
                        .map(({key, value}) => {
                          return `  ${key?.description ?? '<unknown>'} => ${
                            value.description
                          }`;
                        })
                        .join(',\n') +
                      (ro.preview.overflow ? '\n  ...' : '') +
                      '\n}',
                  );

              break;
            case 'weakset':
            case 'set':
              ro.preview.entries === undefined
                ? args.push('{}')
                : args.push(
                    '{ ' +
                      ro.preview.entries
                        .map(({value}) => {
                          return `${value.description}`;
                        })
                        .join(', ') +
                      (ro.preview.overflow ? ', ...' : '') +
                      ' }',
                  );
              break;
            case 'regexp':
              break;
            case 'date':
              break;
            case 'generator':
              args.push(ro.preview?.properties[0]?.value || '');
              break;
            case 'promise':
              if (ro.preview?.properties[0]?.value === 'pending') {
                args.push(`{<${ro.preview.properties[0].value}>}`);
              } else {
                args.push(
                  `{<${ro.preview?.properties[0]?.value}>: ${ro.preview?.properties[1]?.value}}`,
                );
              }
              break;
            case 'node':
            case 'iterator':
            case 'proxy':
            case 'typedarray':
            case 'arraybuffer':
            case 'dataview':
            case 'webassemblymemory':
            case 'wasmvalue':
              break;
            case 'error':
              const errorProperties = {
                message:
                  ro.preview.description
                    ?.split('\n')
                    .filter((line) => !/^\s+at\s/.test(line))
                    .join('\n') ??
                  ro.preview.properties.find(({name}) => name === 'message')
                    ?.value ??
                  '',
                stack:
                  ro.preview.description ??
                  ro.description ??
                  ro.preview.properties.find(({name}) => name === 'stack')
                    ?.value,
                cause: ro.preview.properties.find(({name}) => name === 'cause')
                  ?.value as unknown,
              };

              // Even though we have gathered all the properties, they are likely
              // truncated so we need to fetch their full version.
              const error = await reconstructError(errorProperties, ro);

              // Replace its description in args
              args.splice(-1, 1, error);

              break;
            default:
              args.push(
                '{\n' +
                  ro.preview.properties
                    .map(({name, value}) => {
                      return `  ${name}: ${value}`;
                    })
                    .join(',\n') +
                  (ro.preview.overflow ? '\n  ...' : '') +
                  '\n}',
              );
          }
        }
        break;
      default:
        args.push(ro.description || ro.unserializableValue || '🦋');
        break;
    }
  }

  const method = mapConsoleAPIMessageTypeToConsoleMethod[evt.type];

  if (method in console) {
    switch (method) {
      case 'dir':
        console.dir(args);
        break;
      case 'table':
        console.table(args);
        break;
      default:
        // @ts-expect-error
        console[method].apply(console, args);
        break;
    }
  } else {
    console.warn(`Unsupported console method: ${method}`);
    console.warn('console event:', evt);
  }
}

/**
 * Converts a structured-error to a friendly, source-mapped error string.
 * @param sourceMapConsumer source-map to use for mapping locations
 * @param message first line of stack trace (e.g. `Error: message`)
 * @param frames structured stack entries for error location
 */
function formatStructuredError(
  sourceMapConsumer: SourceMapConsumer,
  message?: string,
  frames?: Protocol.Runtime.CallFrame[],
): string {
  const lines: string[] = [];
  if (message !== undefined) lines.push(message);
  // Pass each of the callframes into the consumer, and format the error
  frames?.forEach(({functionName, lineNumber, columnNumber}, i) => {
    try {
      if (lineNumber) {
        // `Protocol.Runtime.CallFrame` uses 0-indexed line and column
        // numbers, whereas `source-map` expects 1-indexing for lines and
        // 0-indexing for columns;
        const pos = sourceMapConsumer.originalPositionFor({
          line: lineNumber + 1,
          column: columnNumber,
        });

        // Print out line which caused error:
        if (i === 0 && pos.source && pos.line) {
          const fileSource = sourceMapConsumer.sourceContentFor(pos.source);
          const fileSourceLine = fileSource?.split('\n')[pos.line - 1] || '';
          lines.push(fileSourceLine.trim());

          // If we have a column, we can mark the position underneath
          if (pos.column) {
            lines.push(
              `${' '.repeat(pos.column - fileSourceLine.search(/\S/))}^`,
            );
          }
        }

        // From the way esbuild implements the "names" field:
        // > To save space, the original name is only recorded when it's different from the final name.
        // however, source-map consumer does not handle this
        if (pos && pos.line !== null && pos.column !== null) {
          const convertedFnName = pos.name || functionName || '';
          let convertedLocation = `${pos.source}:${pos.line}:${pos.column + 1}`;

          if (convertedFnName === '') {
            lines.push(`    at ${convertedLocation}`);
          } else {
            lines.push(`    at ${convertedFnName} (${convertedLocation})`);
          }
        }
      }
    } catch {
      // Line failed to parse through the sourcemap consumer
      // We should handle this better
    }
  });

  return lines.join('\n');
}

/**
 * Converts an unstructured-stack to a friendly, source-mapped error string.
 * @param sourceMapConsumer source-map to use for mapping locations
 * @param stack string stack trace from `Error#stack`
 */
function formatStack(sourceMapConsumer: SourceMapConsumer, stack: string) {
  const message = stack.split('\n')[0];
  // `stack-trace` requires an object with a `stack` property:
  // https://github.com/felixge/node-stack-trace/blob/ba06dcdb50d465cd440d84a563836e293b360427/index.js#L21-L23
  const callSites = parseStackTrace({stack} as Error);
  const frames = callSites.map<Protocol.Runtime.CallFrame>((site) => ({
    functionName: site.getFunctionName() ?? '',
    // `Protocol.Runtime.CallFrame`s line numbers are 0-indexed, hence `- 1`
    lineNumber: (site.getLineNumber() ?? 1) - 1,
    columnNumber: site.getColumnNumber() ?? 1,
    // Unused by `formattedError`
    scriptId: '',
    url: '',
  }));

  return formatStructuredError(sourceMapConsumer, message, frames);
}
