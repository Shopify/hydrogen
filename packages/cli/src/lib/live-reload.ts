// Support Remix HMR and HDR.
// Note: This is not a public API in Remix and may change at any time.

import http from 'node:http';
// TODO: Import from @react-router/dev when available
type AssetsManifest = {
  version: string;
  url?: string;
  entry: {
    module: string;
    imports: string[];
  };
  routes: Record<
    string,
    {
      id: string;
      path?: string;
      file: string;
      imports?: string[];
    }
  >;
};
// @ts-ignore - internal API
import type {Result as RemixBuildResult} from '@react-router/dev/dist/result.js';
// @ts-ignore - internal API
import type {Context as RemixContext} from '@react-router/dev/dist/compiler/context.js';
import {handleRemixImportFail} from './remix-config.js';
import {importLocal} from './import-utils.js';

type LiveReloadState = {
  manifest?: AssetsManifest;
  prevManifest?: AssetsManifest;
  loaderChanges?: Promise<RemixBuildResult<Record<string, string>>>;
  prevLoaderHashes?: Record<string, string>;
};

export async function setupLiveReload(devServerPort: number, root: string) {
  try {
    type RemixHmr =
      // @ts-ignore - internal API
      typeof import('@react-router/dev/dist/devServer_unstable/hmr.js');
    type RemixSocket =
      // @ts-ignore - internal API
      typeof import('@react-router/dev/dist/devServer_unstable/socket.js');
    type RemixHdr =
      // @ts-ignore - internal API
      typeof import('@react-router/dev/dist/devServer_unstable/hdr.js');
    // @ts-ignore - internal API
    type RemixResult = typeof import('@react-router/dev/dist/result.js');

    const [{updates: hmrUpdates}, {serve}, {detectLoaderChanges}, {ok, err}] =
      await Promise.all([
        importLocal<RemixHmr>(
          '@react-router/dev/dist/devServer_unstable/hmr.js',
          root,
        ),
        importLocal<RemixSocket>(
          '@react-router/dev/dist/devServer_unstable/socket.js',
          root,
        ),
        importLocal<RemixHdr>(
          '@react-router/dev/dist/devServer_unstable/hdr.js',
          root,
        ),
        importLocal<RemixResult>('@react-router/dev/dist/result.js', root),
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
