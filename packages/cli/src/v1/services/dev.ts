// @ts-ignore
import {createServer, ViteDevServer} from 'vite';
import {error as kitError} from '@shopify/cli-kit';
import {analytics} from '@shopify/cli-kit';
import {Config} from '@oclif/core';

interface DevOptions {
  commandConfig: Config;
  directory: string;
  force: boolean;
  host: boolean;
  open: boolean;
}

async function dev({commandConfig, directory, force, host, open}: DevOptions) {
  try {
    const server = await createServer({
      root: directory,
      server: {
        open,
        force,
        host,
      },
    });
    await server.listen();
    server.printUrls();
    server.config.logger.info('');
    await analytics.reportEvent({config: commandConfig});
    await closeEvent(server);
  } catch (error: any) {
    const abortError = new kitError.Abort(error.message);
    abortError.stack = error.stack;
    throw abortError;
  }
}

function closeEvent(server: ViteDevServer): Promise<void> {
  return new Promise((resolve) => {
    server.ws.on('close', () => {
      return resolve();
    });
  });
}

export default dev;
