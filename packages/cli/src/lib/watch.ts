import type {
  InferJsonOutputSchema,
  JsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {outputResult, flushStdout} from '@shopify/cli-kit/node/output';
import {AbortError} from '@shopify/cli-kit/node/error';
import {setupResourceCleanup} from './resource-cleanup.js';

export function writeWatchRecord<T extends JsonOutputSchema>(
  schema: T,
  record: InferJsonOutputSchema<T>,
) {
  outputResult(JSON.stringify(schema.validate(record)));
}

export function getWatchError(error: unknown) {
  const message =
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
      ? error.message
      : String(error);
  const tryMessage =
    error instanceof AbortError && typeof error.tryMessage === 'string'
      ? error.tryMessage
      : undefined;
  return {message, ...(tryMessage !== undefined ? {tryMessage} : {})};
}

/** Keep the command's output context alive until its resources have stopped. */
export async function runWatchCommand(
  run: (signal: AbortSignal) => Promise<void>,
) {
  const controller = new AbortController();
  let exitCode: number | undefined;
  const interrupt = () => {
    process.exitCode = exitCode = 130;
    controller.abort();
  };
  const terminate = () => {
    process.exitCode = exitCode = 143;
    controller.abort();
  };
  // signal-exit checks remaining listeners before deciding to re-raise a signal.
  // Keep ours registered while asynchronous watcher cleanup is still running.
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  let running: Promise<void>;
  const restoreExit = setupResourceCleanup(
    async () => {
      controller.abort();
      await running;
      await flushStdout();
    },
    () => exitCode,
  );
  try {
    running = Promise.resolve().then(() => run(controller.signal));
    await running;
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', terminate);
    restoreExit();
  }
  if (exitCode !== undefined) {
    process.exitCode = exitCode;
    await flushStdout();
    process.exit(exitCode);
  }
}
