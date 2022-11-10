// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-console */

export function muteDevLogs({workerReload}: {workerReload?: boolean} = {}) {
  const log = console.log.bind(console);
  console.log = (first, ...rest) => {
    // Miniflare logs
    if (first.includes('[mf:')) {
      if (workerReload !== false && first.includes('Worker reloaded')) {
        return log(first.replace('[mf:inf] ', ''), ...rest);
      }

      if (!first.includes('[mf:err]')) {
        // Hide logs except errors
        return;
      }
    }

    // Remix logs
    if (first.startsWith('💿')) {
      if (first.includes('File changed:')) {
        return log(first.replace(/(\.\.\/)+/, ''), ...rest);
      }
    }

    return log(first, ...rest);
  };
}
