/* eslint-disable no-console */

import {
  renderInfo,
  renderWarning,
  renderFatalError,
} from '@shopify/cli-kit/node/ui';
import {BugError} from '@shopify/cli-kit/node/error';
import {outputContent, outputToken} from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';

type ConsoleMethod = 'log' | 'warn' | 'error' | 'debug' | 'info';
const originalConsole = {...console};
const methodsReplaced = new Set<ConsoleMethod>();

type Matcher = (args: Array<any>) => boolean;
type Replacer = (args: Array<any>) => void | string[];
const addedReplacers = new Set<string>();
const messageReplacers: Array<[Matcher, Replacer]> = [];

export function resetAllLogs() {
  Object.assign(console, originalConsole);
  methodsReplaced.clear();
}

export function addMessageReplacers(
  key: string,
  ...items: Array<[Matcher, Replacer]>
) {
  if (!addedReplacers.has(key)) {
    addedReplacers.add(key);
    messageReplacers.push(...items);
  }
}

const printedMessages = new Set<string | Object>();

/**
 * Certain messages like errors might be printed multiple times.
 * This ensures they are only printed once per second.
 */
function debounceMessage(args: unknown[], debounceFor?: true | number) {
  const key = args
    .map((item) => {
      const message = (item as Error)?.message ?? (item as string);
      return typeof message === 'string' ? message : '';
    })
    .filter(Boolean)
    .join('');

  if (printedMessages.has(key)) return true;

  printedMessages.add(key);
  if (debounceFor !== true) {
    setTimeout(() => printedMessages.delete(key), debounceFor ?? 1000);
  }

  return false;
}

function injectLogReplacer(
  method: ConsoleMethod,
  debouncer?: (args: unknown[]) => true | number | undefined,
) {
  if (!methodsReplaced.has(method)) {
    methodsReplaced.add(method);
    console[method] = (...args: unknown[]) => {
      if (debounceMessage(args, debouncer?.(args))) return;

      const replacer = messageReplacers.find(([matcher]) => matcher(args))?.[1];
      if (!replacer) return originalConsole[method](...args);

      const result = replacer(args);
      if (result) return originalConsole[method](...result);
    };
  }
}

/**
 * Mute logs from Miniflare
 */
export function muteDevLogs({workerReload}: {workerReload?: boolean} = {}) {
  injectLogReplacer('log');

  let isFirstWorkerReload = true;
  addMessageReplacers('dev', [
    ([first]) => typeof first === 'string' && first.includes('[mf:'),
    (args: string[]) => {
      const first = args[0] as string;

      if (workerReload !== false && first.includes('Worker reloaded')) {
        if (isFirstWorkerReload) {
          isFirstWorkerReload = false;
          // return args as string[];
          return;
        }

        return [first.replace('[mf:inf] ', '🔄 ') + '\n', ...args.slice(1)];
      }

      if (!first.includes('[mf:err]')) {
        // Hide logs except errors
        return;
      }
    },
  ]);
}

const originalWrite = process.stdout.write;
/**
 * Modify logs from cli-kit related to authentication
 */
export function muteAuthLogs({
  onPressKey,
  onKeyTimeout,
}: {
  onPressKey: () => void;
  onKeyTimeout: (link?: string) => void;
}) {
  if (process.stdout.write === originalWrite) {
    const write = originalWrite.bind(process.stdout);

    process.stdout.write = ((item, cb: any) => {
      if (typeof item !== 'string') return write(item, cb);

      const replacer = messageReplacers.find(([matcher]) =>
        matcher([item]),
      )?.[1];
      if (!replacer) return write(item, cb);

      const result = replacer([item]);
      if (result) return write(result[0] as string, cb);
    }) as typeof write;
  }

  addMessageReplacers(
    'auth',
    [
      ([first]) => typeof first === 'string' && first.includes('Auto-open'),
      ([first]) => {
        const content = (first as string).replace(' to Shopify Partners', '');

        const link = content.match(/(https?:\/\/.*)Log in/)?.[1];
        onKeyTimeout(link);

        if (link) return;

        return [content];
      },
    ],
    [
      ([first]) => typeof first === 'string' && first.includes('👉'),
      () => {
        onPressKey();
        // Hide logs
        return;
      },
    ],
    [
      ([first]) =>
        typeof first === 'string' &&
        (first.includes('Shopify Partners') || first.includes('Logged in')),
      () => {
        // Hide logs
        return;
      },
    ],
  );

  return () => {
    process.stdout.write = originalWrite;
  };
}

/**
 * Modify logs from Hydrogen to use cli-kit banners
 * Format: `[h2:type:scope] message`. Example: `[h2:error:storefront.query] Wrong query`
 * Where the message can be multiline and the last line
 * can contain links to docs or other resources.
 */
export function enhanceH2Logs(options: {
  graphiqlUrl: string;
  rootDirectory: string;
}) {
  injectLogReplacer('error');
  injectLogReplacer('warn', ([first]) =>
    // Show createStorefrontClient warnings only once.
    (first as any)?.includes?.('[h2:warn:createStorefrontClient]')
      ? true
      : undefined,
  );

  addMessageReplacers('h2-warn', [
    ([first]) => {
      const message = first?.message ?? first;
      return typeof message === 'string' && message.startsWith('[h2:');
    },
    (args: any[]) => {
      const firstArg = args[0];
      const errorObject =
        typeof firstArg === 'object' && !!firstArg.stack
          ? (firstArg as Error)
          : undefined;

      const stringArg = errorObject?.message ?? (firstArg as string);

      const [, type, scope, message] =
        stringArg.match(/^\[h2:([^:]+):([^\]]+)\]\s+(.*)$/ims) || [];

      if (!type || !scope || !message) return args;

      const headline = `In Hydrogen's \`${scope.trim()}\`:\n\n`;

      const lines = message.split('\n');
      const lastLine = lines.at(-1) ?? '';
      const hasLinks = /https?:\/\//.test(lastLine);
      if (hasLinks) lines.pop();

      if (type === 'error' || errorObject) {
        let tryMessage = hasLinks ? lastLine : undefined;
        let stack = errorObject?.stack;
        const cause = errorObject?.cause as
          | {[key: string]: any; graphql?: {query: string; variables: string}}
          | undefined;

        if (!!cause?.graphql?.query) {
          const {query, variables} = cause.graphql;
          const link = `${options.graphiqlUrl}?query=${encodeURIComponent(
            query,
          )}${variables ? `&variables=${encodeURIComponent(variables)}` : ''}`;

          const [, queryType, queryName] =
            query.match(/(query|mutation)\s+(\w+)/) || [];

          tryMessage =
            (tryMessage ? `${tryMessage}\n\n` : '') +
            outputContent`To debug the ${queryType || 'query'}${
              queryName ? ` \`${colors.whiteBright(queryName)}\`` : ''
            }, try it in ${outputToken.link(colors.bold('GraphiQL'), link)}.`
              .value;
        }

        // Sanitize stack trace to only show app code
        const stackLines = stack?.split('\n') ?? [];
        const isAppLine = (line: string) =>
          line.includes(options.rootDirectory) &&
          !line.includes('node_modules');
        const firstAppLineIndex = stackLines.findIndex(isAppLine);
        const lastAppLineIndex =
          stackLines.length -
          [...stackLines]
            .reverse() // findLastIndex requires Node 18
            .findIndex(isAppLine);

        if (firstAppLineIndex > 0 && lastAppLineIndex > firstAppLineIndex) {
          stack =
            [
              stackLines[0], // Error message
              ...stackLines.slice(firstAppLineIndex, lastAppLineIndex), // App code
            ]
              .join('\n')
              .trim() || undefined;
        }

        const error = new BugError(
          headline +
            colors.bold(lines.join('\n').replace(' - Request', '\nRequest')),
          tryMessage,
        );

        error.cause = cause;
        error.stack = stack;
        renderFatalError(error);

        return;
      }

      let reference: undefined | string[] = undefined;

      if (hasLinks) {
        reference = [];
        for (const link of lastLine.matchAll(/https?:\/\/[^\s]+/g)) {
          reference.push(link[0]);
        }
      }

      const render = type === 'warn' ? renderWarning : renderInfo;

      render({
        body: headline + colors.bold(lines.join('\n')),
        reference,
      });

      return;
    },
  ]);
}

const warnings = new Set<string>();
export const warnOnce = (string: string) => {
  if (!warnings.has(string)) {
    console.warn(string);
    warnings.add(string);
  }
};
