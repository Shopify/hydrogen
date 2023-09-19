import {randomUUID} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {readFile} from '@shopify/cli-kit/node/fs';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {
  startServer,
  Request,
  type MiniOxygenOptions as InternalMiniOxygenOptions,
} from '@shopify/mini-oxygen';
import {DEFAULT_PORT} from '../flags.js';
import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';
import {OXYGEN_HEADERS_MAP, logRequestLine} from './common.js';
import {
  clearHistory,
  logRequestEvent,
  streamRequestEvents,
} from '../request-events.js';

export async function startNodeServer({
  root,
  port = DEFAULT_PORT,
  watch = false,
  buildPathWorkerFile,
  buildPathClient,
  env,
}: MiniOxygenOptions): Promise<MiniOxygenInstance> {
  const dotenvPath = resolvePath(root, '.env');
  const oxygenHeaders = Object.fromEntries(
    Object.entries(OXYGEN_HEADERS_MAP).map(([key, value]) => {
      return [key, value.defaultValue];
    }),
  );

  const asyncLocalStorage = new AsyncLocalStorage();
  const serviceBindings = {
    H2O_LOG_EVENT: {
      fetch: (request: Request) =>
        logRequestEvent(
          new Request(request.url, {
            headers: {
              ...Object.fromEntries(request.headers.entries()),
              // Merge some headers from the parent request
              ...(asyncLocalStorage.getStore() as Record<string, string>),
            },
          }),
        ),
    },
  };

  const miniOxygen = await startServer({
    script: await readFile(buildPathWorkerFile),
    workerFile: buildPathWorkerFile,
    assetsDir: buildPathClient,
    publicPath: '',
    port,
    watch,
    autoReload: watch,
    modules: true,
    env: {
      ...env,
      ...process.env,
      ...serviceBindings,
    },
    log: () => {},
    oxygenHeaders,
    async onRequest(request, defaultDispatcher) {
      const url = new URL(request.url);
      if (url.pathname === '/debug-network-server') {
        return request.method === 'DELETE'
          ? clearHistory()
          : streamRequestEvents(request);
      }

      let requestId = request.headers.get('request-id');
      if (!requestId) {
        requestId = randomUUID();
        request.headers.set('request-id', requestId);
      }

      const startTimeMs = Date.now();

      // Provide headers to sub-requests and dispatch the request.
      const response = await asyncLocalStorage.run(
        {'request-id': requestId, purpose: request.headers.get('purpose')},
        () => defaultDispatcher(request),
      );

      logRequestLine(request, {
        responseStatus: response.status,
        durationMs: startTimeMs > 0 ? Date.now() - startTimeMs : 0,
      });

      return response;
    },
  });

  const listeningAt = `http://localhost:${miniOxygen.port}`;

  return {
    listeningAt,
    port: miniOxygen.port,
    async reload(options) {
      const nextOptions: Partial<InternalMiniOxygenOptions> = {};

      if (options?.env) {
        nextOptions.env = {
          ...options.env,
          ...(process.env as Record<string, string>),
        };
      }

      nextOptions.script = await readFile(buildPathWorkerFile);

      await miniOxygen.reload(nextOptions);
    },
    showBanner(options) {
      console.log('');
      renderSuccess({
        headline: `${options?.headlinePrefix ?? ''}MiniOxygen ${
          options?.mode ?? 'development'
        } server running.`,
        body: [
          `View ${options?.appName ?? 'Hydrogen'} app: ${listeningAt}`,
          ...(options?.extraLines ?? []),
        ],
      });
      console.log('');
    },
    async close() {
      await miniOxygen.close();
    },
  };
}
