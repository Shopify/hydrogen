import {readFile} from 'fs/promises';
import {SourceMapConsumer} from 'source-map';
import WebSocket from 'ws';
import {Protocol} from 'devtools-protocol';
import type {MessageEvent} from 'ws';

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

export function connectToInspector(props: InspectorProps) {
  /**
   * A simple decrementing id to attach to messages sent to DevTools.
   * Use negative ids to void collisions with DevTools messages.
   */
  const messageCounterRef = {value: -1};
  const getMessageId = () => messageCounterRef.value--;

  const ws = new WebSocket(props.inspectorUrl);

  /**
   * A handle to the interval we run to keep the websocket alive
   */
  let keepAliveInterval: NodeJS.Timer;

  /**
   * Test if the websocket is closed
   */
  const isClosed = () =>
    ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING;

  /**
   * Send a message to the remote websocket
   */
  const send = (event: Record<string, unknown>) => {
    if (!isClosed()) {
      ws.send(JSON.stringify(event));
    }
  };

  const closeWs = () => {
    if (!isClosed()) {
      try {
        ws.close();
      } catch (err) {
        // Closing before the websocket is ready will throw an error.
      }
    }
  };

  ws.addEventListener('message', async (event: MessageEvent) => {
    if (typeof event.data === 'string') {
      const evt = JSON.parse(event.data);
      console.log('MESSAGE!', evt);
      if (evt.result) {
        console.log(evt?.result?.result);
      }
      if (evt.method === 'Runtime.exceptionThrown') {
        const params = evt.params as Protocol.Runtime.ExceptionThrownEvent;

        // Parse stack trace with source map.
        if (props.sourceMapPath) {
          // Parse in the sourcemap
          const mapContent = JSON.parse(
            await readFile(props.sourceMapPath, 'utf-8'),
          );

          // Create the lines for the exception details log
          const exceptionLines = [
            params.exceptionDetails.exception?.description?.split('\n')[0],
          ];

          await SourceMapConsumer.with(mapContent, null, async (consumer) => {
            // Pass each of the callframes into the consumer, and format the error
            const stack = params.exceptionDetails.stackTrace?.callFrames;

            stack?.forEach(({functionName, lineNumber, columnNumber}, i) => {
              try {
                if (lineNumber) {
                  // The line and column numbers in the stackTrace are zero indexed,
                  // whereas the sourcemap consumer indexes from one.
                  const pos = consumer.originalPositionFor({
                    line: lineNumber + 1,
                    column: columnNumber + 1,
                  });

                  // Print out line which caused error:
                  if (i === 0 && pos.source && pos.line) {
                    const fileSource = consumer.sourceContentFor(pos.source);
                    const fileSourceLine =
                      fileSource?.split('\n')[pos.line - 1] || '';
                    exceptionLines.push(fileSourceLine.trim());

                    // If we have a column, we can mark the position underneath
                    if (pos.column) {
                      exceptionLines.push(
                        `${' '.repeat(
                          pos.column - fileSourceLine.search(/\S/),
                        )}^`,
                      );
                    }
                  }

                  // From the way esbuild implements the "names" field:
                  // > To save space, the original name is only recorded when it's different from the final name.
                  // however, source-map consumer does not handle this
                  if (pos && pos.line != null) {
                    const convertedFnName = pos.name || functionName || '';
                    exceptionLines.push(
                      `    at ${convertedFnName} (${pos.source}:${pos.line}:${pos.column})`,
                    );
                  }
                }
              } catch {
                // Line failed to parse through the sourcemap consumer
                // We should handle this better
              }
            });
          });

          // Log the parsed stacktrace
          console.error(
            params.exceptionDetails.text,
            exceptionLines.join('\n'),
          );
        } else {
          // We log the stacktrace to the terminal
          console.error(
            params.exceptionDetails.text,
            params.exceptionDetails.exception?.description ?? '',
          );
        }
      }
      if (evt.method === 'Runtime.consoleAPICalled') {
        logConsoleMessage(
          evt.params as Protocol.Runtime.ConsoleAPICalledEvent,
          send,
          getMessageId,
        );
      }
    } else {
      // We should never get here, but who know is 2022...
      console.error('Unrecognised devtools event:', event);
    }
  });

  ws.once('open', () => {
    send({method: 'Runtime.enable', id: getMessageId()});
    // TODO: Why does this need a timeout?
    setTimeout(() => {
      send({method: 'Network.enable', id: getMessageId()});
    }, 2000);

    keepAliveInterval = setInterval(() => {
      send({
        method: 'Runtime.getIsolateId',
        id: getMessageId(),
      });
    }, 10_000);
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
    console.log('ws close');
    clearInterval(keepAliveInterval);
  });

  return () => {
    // clean up! Let's first stop the heartbeat interval
    clearInterval(keepAliveInterval);
    // Then we'll send a message to the devtools instance to
    // tell it to clear the console.
    // Finally, we'll close the websocket
    if (!isClosed()) {
      try {
        ws.close();
      } catch (err) {
        // Closing before the websocket is ready will throw an error.
      }
    }
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

function logConsoleMessage(
  evt: Protocol.Runtime.ConsoleAPICalledEvent,
  send: (message: {id: number; [key: string]: any}) => void,
  getMessageId: () => number,
): void {
  const args: string[] = [];
  console.log('logConsoleMessage' + Math.random(), evt);
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
          args.push(ro.preview.description ?? '<no-description>');

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
            default:
              console.log('sending...', ro.objectId);

              setTimeout(() => {
                send({
                  method: 'Runtime.getProperties',
                  id: getMessageId(),
                  params: {
                    objectId: ro.objectId!,
                    ownProperties: true,
                  },
                });
              }, 1000);

              console.log('error!', ro.preview.properties);
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
        // eslint-disable-next-line prefer-spread
        console[method].apply(console, args);
        break;
    }
  } else {
    console.warn(`Unsupported console method: ${method}`);
    console.warn('console event:', evt);
  }
}
