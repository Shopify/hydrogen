import { handleMiniOxygenImportFail } from './common.js';
export { DEFAULT_INSPECTOR_PORT } from './common.js';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
async function buildAssetsUrl(port, root) {
  const miniOxygenPath = require2.resolve("@shopify/mini-oxygen", {
    paths: [root]
  });
  const { buildAssetsUrl: _buildAssetsUrl } = await import(miniOxygenPath).catch(handleMiniOxygenImportFail);
  return _buildAssetsUrl(port);
}
async function startMiniOxygen(options, useNodeRuntime = false) {
  if (useNodeRuntime) {
    process.env.MINIFLARE_SUBREQUEST_LIMIT = 100;
    const { startNodeServer } = await import('./node.js');
    return startNodeServer(options);
  }
  const { startWorkerdServer } = await import('./workerd.js');
  return startWorkerdServer(options);
}

export { buildAssetsUrl, startMiniOxygen };
