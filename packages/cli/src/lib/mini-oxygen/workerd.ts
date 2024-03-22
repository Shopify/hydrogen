import {dirname, resolvePath} from '@shopify/cli-kit/node/path';
import {readFile} from '@shopify/cli-kit/node/fs';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {outputContent, outputToken} from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';
import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';
import {
  SUBREQUEST_PROFILER_ENDPOINT,
  handleMiniOxygenImportFail,
  logRequestLine,
} from './common.js';
import {
  H2O_BINDING_NAME,
  handleDebugNetworkRequest,
  createLogRequestEvent,
  setConstructors,
} from '../request-events.js';

export async function startWorkerdServer({
  root,
  port: appPort,
  inspectorPort: publicInspectorPort,
  assetsPort,
  debug = false,
  watch = false,
  buildPathWorkerFile,
  buildPathClient,
  env,
}: MiniOxygenOptions): Promise<MiniOxygenInstance> {
  const {createMiniOxygen, Response} = await import(
    '@shopify/mini-oxygen'
  ).catch(handleMiniOxygenImportFail);

  setConstructors({Response});

  const absoluteBundlePath = resolvePath(root, buildPathWorkerFile);
  const mainWorkerName = 'hydrogen';

  const miniOxygen = createMiniOxygen({
    debug,
    logRequestLine,
    port: appPort,
    host: 'localhost',
    liveReload: watch,
    inspectorPort: publicInspectorPort,
    inspectWorkerName: mainWorkerName,
    assets: {port: assetsPort, directory: buildPathClient},
    workers: [
      {
        name: 'subrequest-profiler',
        modules: true,
        script: `export default { fetch: (request, env) =>
          new URL(request.url).pathname === '${SUBREQUEST_PROFILER_ENDPOINT}'
            ? env.profiler.fetch(request)
            : env.next.fetch(request)
        }`,
        serviceBindings: {
          profiler: handleDebugNetworkRequest,
          next: mainWorkerName,
        },
      },
      {
        name: mainWorkerName,
        modulesRoot: dirname(absoluteBundlePath),
        modules: [
          {
            type: 'ESModule',
            path: absoluteBundlePath,
            contents: await readFile(absoluteBundlePath),
          },
        ],
        bindings: {...env},
        serviceBindings: {
          [H2O_BINDING_NAME]: createLogRequestEvent({
            transformLocation: () => absoluteBundlePath,
          }),
        },
      },
    ],
  });

  const listeningAt = (await miniOxygen.ready).origin;

  return {
    port: appPort,
    listeningAt,
    reload(nextOptions) {
      return miniOxygen.reload(async ({workers}) => {
        const mainWorker = workers.find(({name}) => name === mainWorkerName)!;

        if (Array.isArray(mainWorker.modules) && mainWorker.modules[0]) {
          mainWorker.modules[0].contents = await readFile(absoluteBundlePath);
        }

        if (nextOptions) {
          mainWorker.bindings = {...(nextOptions?.env ?? env)};
        }

        return {workers};
      });
    },
    showBanner(options) {
      console.log(''); // New line

      renderSuccess({
        headline: `${
          options?.headlinePrefix ?? ''
        }MiniOxygen (Worker Runtime) ${
          options?.mode ?? 'development'
        } server running.`,
        body: [
          `View ${options?.appName ?? 'Hydrogen'} app: ${listeningAt}`,
          ...(options?.extraLines ?? []),
          ...(debug ? [{warn: getDebugBannerLine(publicInspectorPort)}] : []),
        ],
      });

      console.log('');
    },
    async close() {
      await miniOxygen.dispose();
    },
  };
}

export function getDebugBannerLine(publicInspectorPort: number) {
  const isVSCode = process.env.TERM_PROGRAM === 'vscode';
  const debuggingDocsLink =
    'https://h2o.fyi/debugging/server-code' +
    (isVSCode ? '#visual-studio-code' : '#step-2-attach-a-debugger');

  return outputContent`\n\nDebugging enabled on port ${String(
    publicInspectorPort,
  )}.\nAttach a ${outputToken.link(
    colors.yellow(isVSCode ? 'VSCode debugger' : 'debugger'),
    debuggingDocsLink,
  )} or open DevTools in http://localhost:${String(publicInspectorPort)}.`
    .value;
}
