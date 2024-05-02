import {handleMiniOxygenImportFail} from './common.js';
import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';
import {createRequire} from 'node:module';

export type MiniOxygen = MiniOxygenInstance;

export {DEFAULT_INSPECTOR_PORT} from './common.js';

const require = createRequire(import.meta.url)

export async function buildAssetsUrl(port: number, root: string) {
  const miniOxygenPath = require.resolve('@shopify/mini-oxygen', {paths: [root]});
  type MiniOxygenType = typeof import('@shopify/mini-oxygen');
  const {buildAssetsUrl: _buildAssetsUrl}: MiniOxygenType = await import(
    miniOxygenPath
  ).catch(handleMiniOxygenImportFail);

  return _buildAssetsUrl(port);
}

export async function startMiniOxygen(
  options: MiniOxygenOptions,
  useNodeRuntime = false,
): Promise<MiniOxygenInstance> {
  if (useNodeRuntime) {
    // @ts-expect-error Valid env var for Miniflare v2:
    // https://github.com/cloudflare/miniflare/blob/f919a2eaccf30d63f435154969e4233aa3b9531c/packages/shared/src/context.ts#L18
    // Note: this must be set before importing Miniflare
    process.env.MINIFLARE_SUBREQUEST_LIMIT = 100;

    const {startNodeServer} = await import('./node.js');
    return startNodeServer(options);
  }

  const {startWorkerdServer} = await import('./workerd.js');
  return startWorkerdServer(options);
}
