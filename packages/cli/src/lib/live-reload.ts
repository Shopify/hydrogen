// Support Remix 0.14 HMR and HDR.
// Most of this file is copied from Remix 0.14's `@remix-run/dev` package.
// https://github.com/remix-run/remix/blob/%40remix-run/dev%401.14.0/packages/remix-dev/devServer2.ts
// Requirements:
// - Enable `future.unstable_dev` in `remix.config.js`
// - Add <LiveReload /> to the root of your app

import type {AssetsManifest, ResolvedRemixConfig} from '@remix-run/dev';
import type {updates as HMRUpdates} from '@remix-run/dev/dist/hmr.js';
import type {serve as LiveReloadServe} from '@remix-run/dev/dist/liveReload.js';
import type {CompileResult} from '@remix-run/dev/dist/compiler/index.js';

type LiveReload = {
  hmrUpdates: typeof HMRUpdates;
  socket: ReturnType<typeof LiveReloadServe>;
  onInitialBuild: (build?: CompileResult) => void;
  hotUpdate: (build?: CompileResult) => void;
  previousBuild?: CompileResult;
};

export async function setupLiveReload(
  config: ResolvedRemixConfig,
  appPort: number,
) {
  let liveReload: LiveReload | undefined;

  if (config.future?.unstable_dev) {
    try {
      const {updates} = await import('@remix-run/dev/dist/hmr.js');
      const {serve} = await import('@remix-run/dev/dist/liveReload.js');
      liveReload = {
        hmrUpdates: updates,
        socket: await serve({port: config.devServerPort}),
        onInitialBuild: (build?: CompileResult) => {
          liveReload!.previousBuild = build;
        },
        hotUpdate: (build?: CompileResult) =>
          hotUpdate(config, liveReload!, appPort, build),
      };
    } catch (error) {
      console.warn(
        'Could not start HMR server. Please make sure you are using the latest version of Remix.' +
          ' Defaulting to regular live reload.',
        (error as Error).stack,
      );
    }
  }

  return liveReload;
}

async function hotUpdate(
  config: ResolvedRemixConfig,
  liveReload: LiveReload,
  appPort: number,
  build?: CompileResult,
) {
  if (build) {
    const {assetsManifest} = build;

    await waitForAppServer(
      assetsManifest.version,
      config.future.unstable_dev,
      appPort,
    );

    if (assetsManifest.hmr && liveReload.previousBuild) {
      liveReload.socket.hmr(
        assetsManifest,
        liveReload.hmrUpdates(config, build, liveReload.previousBuild),
      );
    } else {
      liveReload.socket.reload();
    }
  }

  liveReload.previousBuild = build;
}

// Copied from Remix:
async function waitForAppServer(
  buildHash: string,
  unstableDev: ResolvedRemixConfig['future']['unstable_dev'],
  appPort: number,
) {
  const dev = typeof unstableDev === 'boolean' ? {} : unstableDev;
  const url = `http://localhost:${dev.appServerPort ?? appPort}${
    dev.remixRequestHandlerPath ?? ''
  }/__REMIX_ASSETS_MANIFEST`;

  while (true) {
    try {
      let res = await fetch(url);
      let assetsManifest = (await res.json()) as AssetsManifest;
      if (assetsManifest?.version === buildHash) break;
    } catch {
      //
    }

    await new Promise((resolve) =>
      setTimeout(resolve, dev.rebuildPollIntervalMs ?? 50),
    );
  }

  await new Promise((resolve) => setTimeout(resolve, -1));
}
