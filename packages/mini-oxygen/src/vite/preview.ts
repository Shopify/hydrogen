import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import {loadEnv, type PreviewServer, type ResolvedConfig} from 'vite';
import {
  hasProvidedEnvBindings,
  type MiniOxygenRuntimeOptions,
} from './environment.js';
import {getHydrogenCompatibilityDate} from './compat-date.js';
import {
  createMiniOxygen,
  defaultLogRequestLine,
  type RequestHook,
} from '../worker/index.js';
import {findPort} from '../common/find-port.js';
import {pipeFromWeb, toMiniflareRequest, toWeb} from './utils.js';

const DEFAULT_PREVIEW_ENTRY = 'dist/server/index.js';
const DEFAULT_PREVIEW_ENTRY_FILES = ['index.js', 'index.mjs'];
const DEFAULT_PREVIEW_ASSETS_PORT = 9100;

export type OxygenPreviewOptions = {
  /**
   * Built worker module used by `vite preview`.
   * Defaults to the detected server output entry, then dist/server/index.js.
   */
  previewEntry?: string;
};

type PreviewRuntimePluginOptions = OxygenPreviewOptions &
  Partial<
    Pick<
      MiniOxygenRuntimeOptions,
      'env' | 'inspectorPort' | 'logRequestLine' | 'debug'
    >
  >;

export async function setupOxygenPreviewServer(
  previewServer: PreviewServer,
  pluginOptions: PreviewRuntimePluginOptions,
  apiOptions: MiniOxygenRuntimeOptions,
) {
  const previewRuntime = await createOxygenPreviewRuntime(
    previewServer,
    pluginOptions,
    apiOptions,
  );

  previewServer.httpServer.once('close', () => {
    void previewRuntime.dispose();
  });

  return () => {
    previewServer.middlewares.use(
      async function o2HandlePreviewWorkerRequest(req, res, next) {
        try {
          const response = await previewRuntime.dispatchFetch(
            toMiniflareRequest(toWeb(req)),
          );

          await pipeFromWeb(
            new Response(response.body as ReadableStream | null, {
              status: response.status,
              statusText: response.statusText,
              headers: Array.from(response.headers.entries()),
            }),
            res,
          );
        } catch (error) {
          next(error);
        }
      },
    );
  };
}

async function createOxygenPreviewRuntime(
  previewServer: PreviewServer,
  pluginOptions: PreviewRuntimePluginOptions,
  apiOptions: MiniOxygenRuntimeOptions,
) {
  const {root} = previewServer.config;
  const {assetsDir, workerFile} = resolvePreviewOutputPaths(
    previewServer.config,
    pluginOptions.previewEntry,
  );

  if (!existsSync(assetsDir)) {
    throw new Error(
      `No Oxygen preview client assets were found at "${formatPath(
        root,
        assetsDir,
      )}". Run your build before starting \`vite preview\`.`,
    );
  }

  if (!existsSync(workerFile)) {
    throw new Error(
      pluginOptions.previewEntry
        ? `No Oxygen preview worker entry was found at "${formatPath(
            root,
            workerFile,
          )}". Check \`oxygen({ previewEntry })\` or run your build before starting \`vite preview\`.`
        : `No Oxygen preview worker entry was found. Configure \`oxygen({ previewEntry })\` or build a worker at "${DEFAULT_PREVIEW_ENTRY}".`,
    );
  }

  const remoteEnv = await Promise.resolve(apiOptions.envPromise);
  const fallbackEnv =
    !hasProvidedEnvBindings(pluginOptions) &&
    !hasProvidedEnvBindings(apiOptions)
      ? loadEnv(previewServer.config.mode, previewServer.config.envDir, '')
      : undefined;

  const env = Object.assign(
    {},
    fallbackEnv,
    remoteEnv,
    apiOptions.env,
    pluginOptions.env,
  );
  const compatibilityDate =
    apiOptions.compatibilityDate ?? getHydrogenCompatibilityDate(root);
  const requestHook = getPreviewRequestHook(pluginOptions, apiOptions);

  const previewRuntime = createMiniOxygen({
    debug: apiOptions.debug ?? pluginOptions.debug ?? false,
    inspectorPort: apiOptions.inspectorPort ?? pluginOptions.inspectorPort,
    assets: {
      directory: assetsDir,
      port: await findPort(DEFAULT_PREVIEW_ASSETS_PORT),
    },
    ...(requestHook !== undefined && {requestHook}),
    workers: [
      {
        name: 'preview',
        modulesRoot: dirname(workerFile),
        modules: [
          {
            type: 'ESModule',
            path: workerFile,
            contents: await readFile(workerFile, 'utf8'),
          },
        ],
        bindings: env,
        ...(compatibilityDate && {compatibilityDate}),
      },
    ],
  });

  await previewRuntime.ready;

  return previewRuntime;
}

function resolvePreviewOutputPaths(
  config: ResolvedConfig,
  previewEntry?: string,
) {
  const root = config.root;
  const clientOutDir = resolveFromRoot(
    root,
    config.environments.client?.build.outDir ?? config.build.outDir,
  );

  if (previewEntry) {
    return {
      assetsDir: clientOutDir,
      workerFile: resolveFromRoot(root, previewEntry),
    };
  }

  const workerDirs = [
    basename(clientOutDir) === 'client'
      ? join(dirname(clientOutDir), 'server')
      : undefined,
    resolve(root, 'dist/server'),
  ].filter((dir, index, dirs): dir is string => {
    return Boolean(dir && dirs.indexOf(dir) === index);
  });

  for (const workerDir of workerDirs) {
    for (const entryFile of DEFAULT_PREVIEW_ENTRY_FILES) {
      const workerFile = join(workerDir, entryFile);
      if (existsSync(workerFile)) {
        return {assetsDir: clientOutDir, workerFile};
      }
    }
  }

  return {
    assetsDir: clientOutDir,
    workerFile: resolve(root, DEFAULT_PREVIEW_ENTRY),
  };
}

function resolveFromRoot(root: string, path: string) {
  return isAbsolute(path) ? path : resolve(root, path);
}

function formatPath(root: string, path: string) {
  const relativePath = relative(root, path);
  return relativePath && !relativePath.startsWith('..') ? relativePath : path;
}

function getPreviewRequestHook(
  pluginOptions: PreviewRuntimePluginOptions,
  apiOptions: MiniOxygenRuntimeOptions,
): RequestHook | null | undefined {
  const requestHook = apiOptions.requestHook;
  const logRequestLine =
    pluginOptions.logRequestLine ?? apiOptions.logRequestLine;

  if (!requestHook) return logRequestLine;
  if (logRequestLine === null) return requestHook;

  return async (info) => {
    await Promise.all([
      requestHook(info),
      (logRequestLine ?? defaultLogRequestLine)(info),
    ]);
  };
}
