/**
 * Adds the stack trace of a synchronous error to an asynchronous error.
 */
export function withSyncStack<T>(
  syncStackTracedError: Error,
  promise: Promise<T>,
): Promise<T> {
  return promise.catch((error: Error) => {
    const syncStack = syncStackTracedError.stack ?? '';

    error.stack =
      `Error: ${error.message}\n` +
      syncStack.slice(syncStack.indexOf('\n') + 1);

    throw error;
  });
}

export type StackInfo = {
  file?: string;
  func?: string;
  line?: number;
  column?: number;
};

/**
 * Finds the stack line of a caller function without using sourcemaps.
 * @param {number} stackOffset - The number of stack frames to skip.
 * @returns {StackInfo | undefined}
 */
export const getCallerStackLine =
  process.env.NODE_ENV === 'development'
    ? (stackOffset = 0) => {
        let stackInfo: StackInfo | undefined = undefined;
        const original = Error.prepareStackTrace;

        // Accessing sourcemaps slows down execution time significantly.
        // Overwrite the prepareStackTrace function to avoid accessing
        // sourcemaps and just store what we need.
        Error.prepareStackTrace = (_, callsites) => {
          // The first callsite is `getCallerStackLine` itself.
          // The second one is the immediate caller function (e.g. `withCache`).
          // Skip both and find the first ancestor.
          const cs = callsites[2 + stackOffset];

          stackInfo = {
            file: cs?.getFileName() ?? undefined,
            func: cs?.getFunctionName() ?? undefined,
            line: cs?.getLineNumber() ?? undefined,
            column: cs?.getColumnNumber() ?? undefined,
          };

          return '';
        };

        // Create and access stack to run the previous function
        const err = {stack: ''};
        Error.captureStackTrace(err);
        err.stack;

        Error.prepareStackTrace = original;

        return stackInfo;
      }
    : undefined;
