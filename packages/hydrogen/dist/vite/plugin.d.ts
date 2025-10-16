import { Plugin, ConfigEnv } from 'vite';
import { Preset } from '@react-router/dev/config';
import { HydrogenPluginOptions } from './types.js';

type HydrogenSharedOptions = Partial<Pick<HydrogenPluginOptions, 'disableVirtualRoutes'> & Pick<ConfigEnv, 'command'> & {
    remixConfig?: Parameters<NonNullable<Preset['reactRouterConfigResolved']>>[0]['reactRouterConfig'];
}>;
/**
 * For internal use only.
 * @private
 */
type HydrogenPlugin = Plugin<{
    registerPluginOptions(newOptions: HydrogenPluginOptions): void;
    getPluginOptions(): HydrogenSharedOptions;
}>;
/**
 * Enables Hydrogen utilities for local development
 * such as GraphiQL, Subrequest Profiler, etc.
 */
declare function hydrogen(pluginOptions?: HydrogenPluginOptions): Plugin[];

export { type HydrogenPlugin, HydrogenPluginOptions, hydrogen };
