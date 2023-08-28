import {resolvePath} from '@shopify/cli-kit/node/path';
import {fileExists, readFile} from '@shopify/cli-kit/node/fs';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {
  startServer,
  type MiniOxygenOptions as InternalMiniOxygenOptions,
  type Request,
} from '@shopify/mini-oxygen';
import {DEFAULT_PORT} from '../flags.js';
import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';
import {logRequestLine} from './common.js';

export async function startMiniOxygen({
  root,
  port = DEFAULT_PORT,
  watch = false,
  buildPathWorkerFile,
  buildPathClient,
  env,
}: MiniOxygenOptions): Promise<MiniOxygenInstance> {
  const dotenvPath = resolvePath(root, '.env');
  const requestMap = new WeakMap<Request, {startTime: number}>();

  const miniOxygen = await startServer({
    script: await readFile(buildPathWorkerFile),
    assetsDir: buildPathClient,
    publicPath: '',
    port,
    watch,
    autoReload: watch,
    modules: true,
    env: {
      ...env,
      ...process.env,
    },
    envPath: !env && (await fileExists(dotenvPath)) ? dotenvPath : undefined,
    log: () => {},
    onRequest(request) {
      requestMap.set(request, {startTime: Date.now()});
    },
    onResponse(request, response) {
      const startTimeMs = requestMap.get(request)?.startTime ?? 0;
      requestMap.delete(request);

      logRequestLine(request, {
        responseStatus: response.status,
        durationMs: startTimeMs > 0 ? Date.now() - startTimeMs : 0,
      });
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
