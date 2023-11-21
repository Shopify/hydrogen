import {type Protocol} from 'devtools-protocol';
import type {
  InspectorConnection,
  ErrorProperties,
  MessageData,
} from './workerd-inspector.js';
import {SourceMapConsumer} from 'source-map';
import {parse as parseStackTrace} from 'stack-trace';

export function addInspectorConsoleLogger(inspector: InspectorConnection) {
  inspector.ws.addEventListener('message', async (event) => {
    if (typeof event.data !== 'string') {
      // We should never get here, but who know...
      console.error('Unrecognised devtools event:', event);
      return;
    }

    const evt = JSON.parse(event.data) as MessageData;
    inspector.cleanupMessageQueue(evt);

    if (evt.method === 'Runtime.consoleAPICalled') {
      await logConsoleMessage(evt.params, inspector);
    } else if (evt.method === 'Runtime.exceptionThrown') {
      console.error(
        await createErrorFromException(evt.params.exceptionDetails, inspector),
      );
    }
  });
}

export async function createErrorFromException(
  exceptionDetails: Protocol.Runtime.ExceptionDetails,
  inspector: InspectorConnection,
) {
  const errorProperties: ErrorProperties = {};

  const sourceMapConsumer = await inspector.getSourceMapConsumer();
  if (sourceMapConsumer !== undefined) {
    // Create the lines for the exception details log
    const message = exceptionDetails.exception?.description?.split('\n')[0];
    const stack = exceptionDetails.stackTrace?.callFrames;
    const formatted = formatStructuredError(sourceMapConsumer, message, stack);

    errorProperties.message = exceptionDetails.text;
    errorProperties.stack = formatted;
  } else {
    errorProperties.message =
      exceptionDetails.text +
      ' ' +
      (exceptionDetails.exception?.description ?? '');
  }

  return inspector.reconstructError(
    errorProperties,
    exceptionDetails.exception,
  );
}

export async function createErrorFromLog(
  ro: Protocol.Runtime.RemoteObject,
  inspector: InspectorConnection,
) {
  if (ro.subtype !== 'error' || ro.preview?.subtype !== 'error') {
    throw new Error('Not an error object');
  }

  const errorProperties = {
    message:
      ro.preview.description
        ?.split('\n')
        .filter((line) => !/^\s+at\s/.test(line))
        .join('\n') ??
      ro.preview.properties.find(({name}) => name === 'message')?.value ??
      '',
    stack:
      ro.preview.description ??
      ro.description ??
      ro.preview.properties.find(({name}) => name === 'stack')?.value,
    cause: ro.preview.properties.find(({name}) => name === 'cause')
      ?.value as unknown,
  } satisfies ErrorProperties;

  // Even though we have gathered all the properties, they are likely
  // truncated so we need to fetch their full version.
  return inspector.reconstructError(errorProperties, ro);
}

/**
 * This function converts a message serialised as a devtools event
 * into arguments suitable to be called by a console method, and
 * then actually calls the method with those arguments. Effectively,
 * we're just doing a little bit of the work of the devtools console,
 * directly in the terminal.
 */

const mapConsoleAPIMessageTypeToConsoleMethod: {
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
  inspector: InspectorConnection,
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
              const error = await createErrorFromLog(ro, inspector);
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
export function formatStructuredError(
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
export function formatStack(
  sourceMapConsumer: SourceMapConsumer,
  stack: string,
) {
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
