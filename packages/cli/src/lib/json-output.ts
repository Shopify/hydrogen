import {commandEventOutputMode} from '@shopify/cli-kit/node/command-events';
import {jsonOutputEnabled} from '@shopify/cli-kit/node/environment';
import type {
  JsonOutputSchema,
  InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {outputResult} from '@shopify/cli-kit/node/output';

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
