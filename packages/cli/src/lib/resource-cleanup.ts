/**
 * Adds a workaround to ensure that the cleanup function is called before the process exits.
 *
 * Context: Shopify CLI is hooking into process events and calling process.exit.
 * This means we are unable to hook into 'beforeExit' or 'SIGINT" events
 * to cleanup resources. In addition, Miniflare uses `exit-hook` dependency
 * to do the same thing. This is a workaround to ensure we cleanup resources:
 */
export function setupResourceCleanup(
  cleanup: () => Promise<void>,
  getExitCode?: () => number | undefined,
) {
  let closingPromise: Promise<void>;
  const processExit = process.exit;
  const exitWithCleanup = async (code?: number | undefined) => {
    // This function will be called multiple times,
    // but we only want to cleanup resources once.
    closingPromise ??= Promise.resolve().then(cleanup);

    // If the cleanup function hangs, we want to ensure the process exits.
    const timeout = setTimeout(
      () => processExit(getExitCode?.() ?? code),
      5000,
    );

    try {
      await closingPromise;
    } finally {
      clearTimeout(timeout);
      processExit(getExitCode?.() ?? code);
    }
  };
  // @ts-expect-error - Cleanup must finish before the original exit runs.
  process.exit = exitWithCleanup;
  return () => {
    if (process.exit === exitWithCleanup) process.exit = processExit;
  };
}
