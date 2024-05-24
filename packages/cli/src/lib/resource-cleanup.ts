/**
 * Adds a workaround to ensure that the cleanup function is called before the process exits.
 *
 * Context: Shopify CLI is hooking into process events and calling process.exit.
 * This means we are unable to hook into 'beforeExit' or 'SIGINT" events
 * to cleanup resources. In addition, Miniflare uses `exit-hook` dependency
 * to do the same thing. This is a workaround to ensure we cleanup resources:
 */
export function setupResourceCleanup(cleanup: () => Promise<void>) {
  let closingPromise: Promise<void>;
  const processExit = process.exit;
  // @ts-expect-error - Async function
  process.exit = async (code?: number | undefined) => {
    // This function will be called multiple times,
    // but we only want to cleanup resources once.
    closingPromise ??= cleanup();

    // If the cleanup function hangs, we want to ensure the process exits.
    const timeout = setTimeout(() => processExit(code), 5000);

    await closingPromise;

    clearTimeout(timeout);
    return processExit(code);
  };
}
