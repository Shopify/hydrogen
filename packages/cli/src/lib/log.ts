/* eslint-disable no-console */

import {renderWarning, renderFatalError} from '@shopify/cli-kit/node/ui';
import {BugError} from '@shopify/cli-kit/node/error';
import {outputContent, outputToken} from '@shopify/cli-kit/node/output';

type ConsoleMethod = 'log' | 'warn' | 'error' | 'debug' | 'info';
const originalConsole = {...console};
const methodsReplaced = new Set<ConsoleMethod>();

type Matcher = (args: Array<any>) => boolean;
type Replacer = (args: Array<any>) => void | string[];
const addedReplacers = new Set<string>();
const messageReplacers: Array<[Matcher, Replacer]> = [];

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
function debounceMessage(args: unknown[]) {
  const key = args
    .map((item) => {
      const message = (item as Error)?.message ?? (item as string);
      return typeof message === 'string' ? message : '';
    })
    .filter(Boolean)
    .join('');

  if (printedMessages.has(key)) return true;

  printedMessages.add(key);
  setTimeout(() => printedMessages.delete(key), 1000);

  return false;
}

function injectLogReplacer(method: ConsoleMethod) {
  if (!methodsReplaced.has(method)) {
    methodsReplaced.add(method);
    console[method] = (...args: unknown[]) => {
      if (debounceMessage(args)) return;

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

const H2_PREFIX = '[h2:';
/**
 * Modify logs from Hydrogen to use cli-kit banners
 * Format: `[h2:scope] message`
 * Where the message can be multiline and the last line
 * can contain links to docs or other resources.
 */
export function enhanceH2Logs(graphiqlUrl: string) {
  injectLogReplacer('warn');
  injectLogReplacer('error');

  addMessageReplacers('h2-warn', [
    ([first]) => {
      const message = first?.message ?? first;
      return typeof message === 'string' && message.startsWith(H2_PREFIX);
    },
    (args: any[]) => {
      const isError = typeof args[0] === 'object' && !!args[0].stack;
      const [, scope, message] =
        (args[0]?.message ?? args[0]).match(/^\[h2:([^\]]+)\]\s+(.*)$/ims) ||
        [];

      if (!scope || !message) return args;

      let reference: undefined | string[] = undefined;
      const lines = message.split('\n');
      const lastLine = lines.at(-1) ?? '';
      const hasLinks = /https?:\/\//.test(lines.at(-1) ?? '');

      if (hasLinks) {
        lines.pop() ?? '';
      }

      const headline = `Issue found in Hydrogen's \`${scope.trim()}\``;

      if (isError) {
        const errorArg = args[0] as Error;
        let tryMessage = hasLinks ? lastLine : undefined;
        if (errorArg.cause) {
          const {query, variables} = errorArg.cause as Record<string, string>;
          if (query) {
            const link = `${graphiqlUrl}?query=${encodeURIComponent(query)}${
              variables ? `&variables=${encodeURIComponent(variables)}` : ''
            }`;
            tryMessage =
              (tryMessage ? `${tryMessage}\n\n` : '') +
              outputContent`To debug the query, try ${outputToken.link(
                'GraphiQL',
                link,
              )}.`.value;
          }
        }

        const error = new BugError(
          `${headline}:\n` + lines.join('\n'),
          tryMessage,
        );

        error.stack = errorArg.stack;
        error.cause = errorArg.cause;
        renderFatalError(error);

        return;
      }

      if (hasLinks) {
        reference = [];
        for (const link of lastLine.matchAll(/https?:\/\/[^\s]+/g)) {
          reference.push(link[0]);
        }
      }

      renderWarning({
        headline,
        body: lines.join('\n'),
        reference,
      });
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
