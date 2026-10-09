import {commandEventOutputMode} from '@shopify/cli-kit/node/command-events';
import {jsonOutputEnabled} from '@shopify/cli-kit/node/environment';
import type {
  JsonOutputSchema,
  InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {outputInfo, outputResult} from '@shopify/cli-kit/node/output';
import {format} from 'node:util';

/** Keep dependency logs (for example React Router warnings) out of JSON results. */
export async function withJsonConsole<T>(execute: () => Promise<T>) {
  if (!isJsonOutput()) return execute();
  const original = {log: console.log, info: console.info, debug: console.debug};
  const wrappers = {...original};
  for (const method of ['log', 'info', 'debug'] as const) {
    wrappers[method] = (...args: unknown[]) => {
      if (isJsonOutput()) outputInfo(format(...args));
      else original[method](...args);
    };
    console[method] = wrappers[method];
  }
  try {
    return await execute();
  } finally {
    for (const method of ['log', 'info', 'debug'] as const) {
      if (console[method] === wrappers[method])
        console[method] = original[method];
    }
  }
}

export function isJsonOutput() {
  return commandEventOutputMode() === 'json' || jsonOutputEnabled();
}

/** Called by presenters, after execution has returned its domain result. */
export function writeJsonResult<T extends JsonOutputSchema>(
  schema: T,
  result: InferJsonOutputSchema<T>,
  json = isJsonOutput(),
) {
  if (!json) return false;
  outputResult(schema.encode(result));
  return true;
}
