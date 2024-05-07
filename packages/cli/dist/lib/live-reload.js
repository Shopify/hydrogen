import http from 'node:http';
import { handleRemixImportFail } from './remix-config.js';
import { createRequire } from 'module';

const require2 = createRequire(import.meta.url);
async function setupLiveReload(devServerPort, root) {
  try {
    const remixRunHmrPath = require2.resolve(
      "@remix-run/dev/dist/devServer_unstable/hmr.js",
      { paths: [root] }
    );
    const remixRunSocketPath = require2.resolve(
      "@remix-run/dev/dist/devServer_unstable/socket.js",
      { paths: [root] }
    );
    const remixRunHdrPath = require2.resolve(
      "@remix-run/dev/dist/devServer_unstable/hdr.js",
      { paths: [root] }
    );
    const remixRunResultPath = require2.resolve(
      "@remix-run/dev/dist/result.js",
      { paths: [root] }
    );
    const [{ updates: hmrUpdates }, { serve }, { detectLoaderChanges }, { ok, err }] = await Promise.all([
      import(remixRunHmrPath),
      import(remixRunSocketPath),
      import(remixRunHdrPath),
      import(remixRunResultPath)
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
