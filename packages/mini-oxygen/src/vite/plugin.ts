import type {Plugin} from 'vite';
import {
  cloudflare,
  PluginConfig as CloudflarePluginConfig,
} from '@cloudflare/vite-plugin';
import {
  oxygenExtensions,
  OxygenPlugin,
  OxygenPluginOptions,
} from './oxygen-extensions.js';

export {oxygenExtensions} from './oxygen-extensions.js';
export type {OxygenPlugin} from './oxygen-extensions.js';

// Note: Vite resolves extensions like .js or .ts automatically.
const DEFAULT_SSR_ENTRY = './server';

type OxygenAndCloudflarePluginOptions = OxygenPluginOptions & {
  cloudflare?: CloudflarePluginConfig;
};

/**
 * Runs backend code in an Oxygen worker instead of Node.js during development.
 * If used with `remix`, place it before it in the Vite plugin list.
 */
export function oxygen(
  pluginOptions: OxygenAndCloudflarePluginOptions = {},
): Plugin[] {
  // Provide a default wrangler config file path if one is not provided.
  const defaultWranglerConfigPath = './wrangler.toml';
  const defaultedCloudflarePluginConfig: CloudflarePluginConfig = {
    ...pluginOptions.cloudflare,
    configPath:
      pluginOptions.cloudflare?.configPath ?? defaultWranglerConfigPath,
  };

  const oxygenPlugin: OxygenPlugin = oxygenExtensions(pluginOptions);

  return [...cloudflare(defaultedCloudflarePluginConfig), oxygenPlugin];
}
