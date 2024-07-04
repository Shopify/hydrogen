import { createRequire } from 'node:module';
import { resolvePath, dirname } from '@shopify/cli-kit/node/path';
import { createFileReadStream, readFile } from '@shopify/cli-kit/node/fs';
import { renderSuccess } from '@shopify/cli-kit/node/ui';
import { outputNewline } from '@shopify/cli-kit/node/output';
import { AbortError } from '@shopify/cli-kit/node/error';
import colors from '@shopify/cli-kit/node/colors';
import { handleMiniOxygenImportFail, logRequestLine, SUBREQUEST_PROFILER_ENDPOINT } from './common.js';
import { TUNNEL_DOMAIN, getUtilityBannerlines, getDebugBannerLine } from '../dev-shared.js';
import { setConstructors, handleDebugNetworkRequest, H2O_BINDING_NAME, createLogRequestEvent } from '../request-events.js';
import { importLocal } from '../import-utils.js';

async function startWorkerdServer({
  root,
  appPort,
  inspectorPort: publicInspectorPort,
  assetsPort,
  debug = false,
  watch = false,
  buildPathWorkerFile,
  buildPathClient,
  env
}) {
  const { createMiniOxygen, Response } = await importLocal(
    "@shopify/mini-oxygen",
    root
  ).catch(handleMiniOxygenImportFail);
  setConstructors({ Response });
  async function handleCustomerAccountSchema() {
    const require2 = createRequire(import.meta.url);
    const filePath = require2.resolve(
      "@shopify/hydrogen/customer-account.schema.json"
    );
    return new Response(createFileReadStream(filePath), {
      headers: { "Content-Type": "application/json" }
    });
  }
  const mainWorkerName = "hydrogen";
  const absoluteBundlePath = resolvePath(root, buildPathWorkerFile);
  const readWorkerFile = () => readFile(absoluteBundlePath).catch((error) => {
    throw new AbortError(
      `Could not read worker file.

` + error.stack,
      "Did you build the project?"
    );
  });
  const miniOxygen = createMiniOxygen({
    debug,
    port: appPort,
    host: "localhost",
    liveReload: watch,
    requestHook: logRequestLine,
    inspectorPort: publicInspectorPort,
    inspectWorkerName: mainWorkerName,
    assets: { port: assetsPort, directory: buildPathClient },
    workers: [
      {
        name: "hydrogen:middleware",
        modules: true,
        script: `export default { fetch: (request, env) => {
          const url = new URL(request.url);
          if (url.hostname.endsWith('${TUNNEL_DOMAIN.ORIGINAL}')) {
            url.hostname = url.hostname.replace(
              '${TUNNEL_DOMAIN.ORIGINAL}',
              '${TUNNEL_DOMAIN.REBRANDED}',
            );
          }

          return url.pathname === '${SUBREQUEST_PROFILER_ENDPOINT}'
            ? env.profiler.fetch(url, request)
            : url.pathname === '/graphiql/customer-account.schema.json'
            ? env.assets.fetch(url, request)
            : env.next.fetch(url, request)
          }
        }`,
        serviceBindings: {
          profiler: handleDebugNetworkRequest,
          assets: handleCustomerAccountSchema,
          next: mainWorkerName
        }
      },
      {
        name: mainWorkerName,
        modulesRoot: dirname(absoluteBundlePath),
        modules: [
          {
            type: "ESModule",
            path: absoluteBundlePath,
            contents: await readWorkerFile()
          }
        ],
        bindings: { ...env },
        serviceBindings: {
          [H2O_BINDING_NAME]: createLogRequestEvent({
            transformLocation: () => absoluteBundlePath
          })
        }
      }
    ]
  });
  const { workerUrl, inspectorUrl } = await miniOxygen.ready;
  return {
    port: Number(workerUrl.port),
    listeningAt: workerUrl.origin,
    reload(nextOptions) {
      return miniOxygen.reload(async ({ workers }) => {
        const mainWorker = workers.find(({ name }) => name === mainWorkerName);
        if (Array.isArray(mainWorker.modules) && mainWorker.modules[0]) {
          mainWorker.modules[0].contents = await readWorkerFile();
        }
        if (nextOptions) {
          mainWorker.bindings = { ...nextOptions?.env ?? env };
        }
        return { workers };
      });
    },
    showBanner(options) {
      outputNewline();
      const customSections = [];
      if (options?.host) {
        customSections.push({ body: getUtilityBannerlines(options.host) });
      }
      if (inspectorUrl) {
        customSections.push({
          body: { warn: getDebugBannerLine(Number(inspectorUrl.port)) }
        });
      }
      renderSuccess({
        headline: `${options?.headlinePrefix ?? ""}MiniOxygen (Worker Runtime) ${options?.mode ?? "development"} server running.`,
        body: [
          `View ${options?.appName ? colors.cyan(options?.appName) : "Hydrogen"} app:`,
          { link: { url: options?.host || workerUrl.origin } }
        ],
        customSections
      });
      console.log("");
    },
    async close() {
      await miniOxygen.dispose();
    }
  };
}

export { startWorkerdServer };
