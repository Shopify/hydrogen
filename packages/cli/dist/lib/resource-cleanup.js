function setupResourceCleanup(cleanup) {
  let closingPromise;
  const processExit = process.exit;
  process.exit = async (code) => {
    closingPromise ??= cleanup();
    const timeout = setTimeout(() => processExit(code), 5e3);
    await closingPromise;
    clearTimeout(timeout);
    return processExit(code);
  };
}

export { setupResourceCleanup };
