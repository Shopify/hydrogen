// Support Remix HMR and HDR.
// Note: This is not a public API in Remix and may change at any time.

import http from 'node:http';
import type {AssetsManifest} from '@remix-run/dev';
import type {Result as RemixBuildResult} from '@remix-run/dev/dist/result.js';
import type {Context as RemixContext} from '@remix-run/dev/dist/compiler/context.js';
import {handleRemixImportFail} from './remix-config.js';

type LiveReloadState = {
  manifest?: AssetsManifest;
  prevManifest?: AssetsManifest;
  loaderChanges?: Promise<RemixBuildResult<Record<string, string>>>;
  prevLoaderHashes?: Record<string, string>;
};

export async function setupLiveReload(devServerPort: number) {
  try {
    const [{updates: hmrUpdates}, {serve}, {detectLoaderChanges}, {ok, err}] =
      await Promise.all([
        import('@remix-run/dev/dist/devServer_unstable/hmr.js'),
        import('@remix-run/dev/dist/devServer_unstable/socket.js'),
        import('@remix-run/dev/dist/devServer_unstable/hdr.js'),
        import('@remix-run/dev/dist/result.js'),
      ]).catch(handleRemixImportFail);

    const state: LiveReloadState = {};

    const server = http
      .createServer(function (req, res) {
        res.writeHead(200);
        res.end();
      })
      .listen(devServerPort);

    const socket = serve(server);

    return {
      onBuildStart: (ctx: RemixContext) => {
        state.loaderChanges = detectLoaderChanges(ctx).then(ok, err);
      },
      onBuildManifest: (manifest: AssetsManifest) => {
        state.manifest = manifest;
      },
      onAppReady: async (ctx: RemixContext) => {
        const nextState: LiveReloadState = {prevManifest: state.manifest};

        try {
          const loaderChanges = await state.loaderChanges!;
          if (loaderChanges.ok) {
            nextState.prevLoaderHashes = loaderChanges.value;
          }

          if (loaderChanges.ok && state.manifest && state.prevManifest) {
            socket.hmr(
              state.manifest,
              hmrUpdates(
                ctx.config,
                state.manifest,
                state.prevManifest,
                loaderChanges.value,
                state.prevLoaderHashes,
              ),
            );
          } else if (state.prevManifest) {
            // Full reload
            socket.reload();
          }
        } finally {
          Object.assign(state, nextState);
        }
      },
      close: () => {
        socket.close();
        server.close();
      },
    };
  } catch (error) {
    console.warn(
      'Could not start HMR server. Please make sure your Remix packages are in sync with Hydrogen.' +
        ' Defaulting to regular live reload.',
      (error as Error).stack,
    );
  }
}
