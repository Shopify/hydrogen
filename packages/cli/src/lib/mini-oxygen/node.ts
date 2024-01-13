import {randomUUID} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {readFile} from '@shopify/cli-kit/node/fs';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {Response} from '@shopify/mini-oxygen';
import {
  startServer,
  Request,
  type MiniOxygenOptions as InternalMiniOxygenOptions,
} from '@shopify/mini-oxygen';
import {DEFAULT_PORT} from '../flags.js';
import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';
import {OXYGEN_HEADERS_MAP, logRequestLine} from './common.js';
import {
  H2O_BINDING_NAME,
  createLogRequestEvent,
  handleDebugNetworkRequest,
  setConstructors,
} from '../request-events.js';

export async function startNodeServer({
  port = DEFAULT_PORT,
  watch = false,
  buildPathWorkerFile,
  buildPathClient,
  env,
  debug = false,
  inspectorPort,
}: MiniOxygenOptions): Promise<MiniOxygenInstance> {
  const oxygenHeaders = Object.fromEntries(
    Object.entries(OXYGEN_HEADERS_MAP).map(([key, value]) => {
      return [key, value.defaultValue];
    }),
  );

  setConstructors({Response});

  const logRequestEvent = createLogRequestEvent();
  const asyncLocalStorage = new AsyncLocalStorage();
  const serviceBindings = {
    [H2O_BINDING_NAME]: {
      fetch: async (request: Request) =>
        logRequestEvent(
          new Request(request.url, {
            method: 'POST',
            body: JSON.stringify({
              ...(asyncLocalStorage.getStore() as Record<string, string>),
              ...(await request.json<Record<string, string>>()),
            }),
          }),
        ),
    },
  };

  if (debug) {
    (await import('node:inspector')).open(inspectorPort);
  }

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
        return handleDebugNetworkRequest(request);
      }

      let requestId = request.headers.get('request-id');
      if (!requestId) {
        requestId = randomUUID();
        request.headers.set('request-id', requestId);
      }

      const startTimeMs = Date.now();

      // Provide headers to sub-requests and dispatch the request.
      const response = await asyncLocalStorage.run(
        {requestId, purpose: request.headers.get('purpose')},
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
        headline: `${options?.headlinePrefix ?? ''}MiniOxygen (Node Sandbox) ${
          options?.mode ?? 'development'
        } server running.`,
        body: [
          `View ${options?.appName ?? 'Hydrogen'} app: ${listeningAt}`,
          ...(options?.extraLines ?? []),
          ...(debug
            ? [
                {
                  warn: `\n\nDebugger listening on ws://localhost:${inspectorPort}`,
                },
              ]
            : []),
        ],
      });
      console.log('');
    },
    async close() {
      await miniOxygen.close();
    },
  };
}
