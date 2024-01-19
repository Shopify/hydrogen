/**
 * Merges the error information thrown in a promise to a sync stack traced error.
 * The sync stack traced error will have the same name, message, and cause as the
 * original error but will have a stack trace that points to the caller function.
 */
export function withSyncStack<T>(
  syncStackTracedError: Error,
  promise: Promise<T>,
): Promise<T> {
  return promise.catch((error: Error) => {
    // Avoid reading 'stack' property of error to avoid accessing sourcemaps.
    syncStackTracedError.name = error.name;
    syncStackTracedError.message = error.message;
    syncStackTracedError.cause = error.cause;
    throw syncStackTracedError;
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
