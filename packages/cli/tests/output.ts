import {runWithCommandEventsForCommand} from '@shopify/cli-kit/node/command-events';
import {withCapturedStandardStreams} from '@shopify/cli-kit/node/testing/output';

/** Capture the actual encoder and output writer with CLI Kit's stream helper. */
export async function captureJsonOutput(run: () => unknown) {
  const previousJson = process.env.SHOPIFY_FLAG_JSON;
  process.env.SHOPIFY_FLAG_JSON = '1';
  try {
    return await withCapturedStandardStreams(async (streams) => {
      await runWithCommandEventsForCommand(['--json'], run);
      return {stdout: streams.stdout(), stderr: streams.stderr()};
    });
  } finally {
    if (previousJson === undefined) delete process.env.SHOPIFY_FLAG_JSON;
    else process.env.SHOPIFY_FLAG_JSON = previousJson;
  }
}
