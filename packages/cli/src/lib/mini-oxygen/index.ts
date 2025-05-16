import {importLocal} from '../import-utils.js';
import {handleMiniOxygenImportFail} from './common.js';
import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';

export type MiniOxygen = MiniOxygenInstance;

export {DEFAULT_INSPECTOR_PORT} from './common.js';

export async function buildAssetsUrl(port: number, root: string) {
  type MiniOxygenType = typeof import('@shopify/mini-oxygen');
  const {buildAssetsUrl: _buildAssetsUrl} = await importLocal<MiniOxygenType>(
    '@shopify/mini-oxygen',
    root,
  ).catch(handleMiniOxygenImportFail);

  return _buildAssetsUrl(port);
}

export async function startMiniOxygen(
  options: MiniOxygenOptions,
): Promise<MiniOxygenInstance> {
  const {startWorkerdServer} = await import('./workerd.js');
  return startWorkerdServer(options);
}
