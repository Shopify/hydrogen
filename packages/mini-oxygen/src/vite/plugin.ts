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
import process from 'node:process';

export {oxygenExtensions} from './oxygen-extensions.js';
export type {OxygenPlugin} from './oxygen-extensions.js';

// Note: Vite resolves extensions like .js or .ts automatically.
const DEFAULT_SSR_ENTRY = './server';

type OxygenAndCloudflarePluginOptions = OxygenPluginOptions & {
  cloudflare?: CloudflarePluginConfig;
};

type EnhancedCloudflarePluginConfig = CloudflarePluginConfig & {
  config: unknown;
};

function createCloudflareConfig(): unknown {
  return {
    name: 'cloudflare-oxygen-worker',
    compatibility_flags: ['nodejs_compat'],
    compatibility_date: '2024-09-23',
    main: './server.ts',
    vars: process.env,
  };
}

/**
 * Runs backend code in an Oxygen worker instead of Node.js during development.
 * If used with `remix`, place it before it in the Vite plugin list.
 */
export function oxygen(
  pluginOptions: OxygenAndCloudflarePluginOptions = {},
): Plugin[] {
  const defaultedCloudflarePluginConfig: EnhancedCloudflarePluginConfig = {
    ...pluginOptions.cloudflare,
    config: createCloudflareConfig(),
  };
  delete defaultedCloudflarePluginConfig['configPath'];

  const oxygenPlugin: OxygenPlugin = oxygenExtensions(pluginOptions);

  return [...cloudflare(defaultedCloudflarePluginConfig), oxygenPlugin];
}
