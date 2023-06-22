/* eslint-disable no-console */

type ConsoleMethod = 'log' | 'warn' | 'error' | 'debug' | 'info';
const originalConsole = {...console};
const methodsReplaced = new Set<ConsoleMethod>();

type Matcher = (args: Array<any>) => boolean;
type Replacer = (args: Array<any>) => void | string[];
const messageReplacers: Array<[Matcher, Replacer]> = [];

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

injectLogReplacer('log');

export function muteDevLogs({workerReload}: {workerReload?: boolean} = {}) {
  let isFirstWorkerReload = true;
  messageReplacers.push([
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

const warnings = new Set<string>();
export const warnOnce = (string: string) => {
  if (!warnings.has(string)) {
    console.warn(string);
    warnings.add(string);
  }
};
