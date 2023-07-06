/* eslint-disable no-console */

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

function injectLogReplacer(method: ConsoleMethod) {
  if (!methodsReplaced.has(method)) {
    methodsReplaced.add(method);
    console[method] = (...args: unknown[]) => {
      const replacer = messageReplacers.find(([matcher]) => matcher(args))?.[1];
      if (!replacer) return originalConsole[method](...args);

      const result = replacer(args);
      if (result) return originalConsole[method](...result);
    };
  }
}

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

const warnings = new Set<string>();
export const warnOnce = (string: string) => {
  if (!warnings.has(string)) {
    console.warn(string);
    warnings.add(string);
  }
};
