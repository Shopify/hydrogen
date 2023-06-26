/* eslint-disable no-console */

let isFirstWorkerReload = true;

export function muteDevLogs({workerReload}: {workerReload?: boolean} = {}) {
  const log = console.log.bind(console);
  console.log = (first, ...rest) => {
    // Miniflare logs
    if (typeof first === 'string' && first.includes('[mf:')) {
      if (workerReload !== false && first.includes('Worker reloaded')) {
        if (isFirstWorkerReload) isFirstWorkerReload = false;
        else return log(first.replace('[mf:inf] ', '🔄 ') + '\n', ...rest);
      }

      if (!first.includes('[mf:err]')) {
        // Hide logs except errors
        return;
      }
    }

    return log(first, ...rest);
  };
}

const warnings = new Set<string>();
export const hasWarnedAlready = (string: string) => {
  if (!warnings.has(string)) {
    warnings.add(string);
    return false;
  }
  return true;
};
