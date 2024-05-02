// Support Remix HMR and HDR.
// Note: This is not a public API in Remix and may change at any time.

import http from 'node:http';
import type {AssetsManifest} from '@remix-run/dev';
import type {Result as RemixBuildResult} from '@remix-run/dev/dist/result.js';
import type {Context as RemixContext} from '@remix-run/dev/dist/compiler/context.js';
import {handleRemixImportFail} from './remix-config.js';
import {createRequire} from 'module'

const require = createRequire(import.meta.url)
type LiveReloadState = {
  manifest?: AssetsManifest;
  prevManifest?: AssetsManifest;
  loaderChanges?: Promise<RemixBuildResult<Record<string, string>>>;
  prevLoaderHashes?: Record<string, string>;
};

export async function setupLiveReload(devServerPort: number, root: string) {
  try {

    const remixRunHmrPath = require.resolve('@remix-run/dev/dist/devServer_unstable/hmr.js', {paths: [root]});
    type RemixHmr = typeof import('@remix-run/dev/dist/devServer_unstable/hmr.js');

    const remixRunSocketPath = require.resolve('@remix-run/dev/dist/devServer_unstable/socket.js', {paths: [root]});
    type RemixSocket = typeof import('@remix-run/dev/dist/devServer_unstable/socket.js');

    const remixRunHdrPath = require.resolve('@remix-run/dev/dist/devServer_unstable/hdr.js', {paths: [root]});
    type RemixHdr = typeof import('@remix-run/dev/dist/devServer_unstable/hdr.js');

    const remixRunResultPath = require.resolve('@remix-run/dev/dist/result.js', {paths: [root]});
    type RemixResult = typeof import('@remix-run/dev/dist/result.js');

    const [{updates: hmrUpdates}, {serve}, {detectLoaderChanges}, {ok, err}] =
      await Promise.all([
        import(remixRunHmrPath) as Promise<RemixHmr>,
        import(remixRunSocketPath) as Promise<RemixSocket>,
        import(remixRunHdrPath) as Promise<RemixHdr>,
        import(remixRunResultPath) as Promise<RemixResult>,
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
