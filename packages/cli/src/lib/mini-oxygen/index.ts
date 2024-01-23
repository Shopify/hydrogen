import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';

export type MiniOxygen = MiniOxygenInstance;

export {DEFAULT_INSPECTOR_PORT} from './common.js';
export {buildAssetsUrl} from './assets.js';

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
