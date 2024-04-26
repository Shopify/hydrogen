import http from 'node:http';
import { handleRemixImportFail } from './remix-config.js';

async function setupLiveReload(devServerPort) {
  try {
    const [{ updates: hmrUpdates }, { serve }, { detectLoaderChanges }, { ok, err }] = await Promise.all([
      import('@remix-run/dev/dist/devServer_unstable/hmr.js'),
      import('@remix-run/dev/dist/devServer_unstable/socket.js'),
      import('@remix-run/dev/dist/devServer_unstable/hdr.js'),
      import('@remix-run/dev/dist/result.js')
    ]).catch(handleRemixImportFail);
    const state = {};
    const server = http.createServer(function(req, res) {
      res.writeHead(200);
      res.end();
    }).listen(devServerPort);
    const socket = serve(server);
    return {
      onBuildStart: (ctx) => {
        state.loaderChanges = detectLoaderChanges(ctx).then(ok, err);
      },
      onBuildManifest: (manifest) => {
        state.manifest = manifest;
      },
      onAppReady: async (ctx) => {
        const nextState = { prevManifest: state.manifest };
        try {
          const loaderChanges = await state.loaderChanges;
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
                state.prevLoaderHashes
              )
            );
          } else if (state.prevManifest) {
            socket.reload();
          }
        } finally {
          Object.assign(state, nextState);
        }
      },
      close: () => {
        socket.close();
        server.close();
      }
    };
  } catch (error) {
    console.warn(
      "Could not start HMR server. Please make sure your Remix packages are in sync with Hydrogen. Defaulting to regular live reload.",
      error.stack
    );
  }
}

export { setupLiveReload };
