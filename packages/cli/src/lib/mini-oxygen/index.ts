import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';

export type MiniOxygen = MiniOxygenInstance;

export async function startMiniOxygen(
  options: MiniOxygenOptions,
  useWorkerd = false,
): Promise<MiniOxygenInstance> {
  if (useWorkerd) {
    const {startWorkerdServer} = await import('./workerd.js');
    return startWorkerdServer(options);
  } else {
    const {startNodeServer} = await import('./node.js');
    return startNodeServer(options);
  }
}
