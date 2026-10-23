import type {
  InferJsonOutputSchema,
  JsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {outputResult, flushStdout} from '@shopify/cli-kit/node/output';
import {setupResourceCleanup} from './resource-cleanup.js';

export function writeWatchRecord<T extends JsonOutputSchema>(
  schema: T,
  record: InferJsonOutputSchema<T>,
) {
  outputResult(JSON.stringify(schema.validate(record)));
}

/** Keep the command's output context alive until its resources have stopped. */
export async function runWatchCommand(
  run: (signal: AbortSignal) => Promise<void>,
) {
  const controller = new AbortController();
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
    process.exitCode = 130;
    controller.abort();
  };
  const terminate = () => {
    interrupted = true;
    process.exitCode = 143;
    controller.abort();
  };
  // signal-exit checks remaining listeners before deciding to re-raise a signal.
  // Keep ours registered while asynchronous watcher cleanup is still running.
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  let running: Promise<void>;
  const restoreExit = setupResourceCleanup(async () => {
    controller.abort();
    await running;
  });
  try {
    running = run(controller.signal);
    await running;
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', terminate);
    restoreExit();
  }
  if (interrupted) {
    await flushStdout();
    process.exit(process.exitCode);
  }
}
