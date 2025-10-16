import { ViteDevServer } from 'vite';
import { HydrogenPluginOptions } from './types.js';

type HydrogenMiddlewareOptions = HydrogenPluginOptions & {
    isOxygen?: boolean;
};
declare function setupHydrogenMiddleware(viteDevServer: ViteDevServer, options: HydrogenMiddlewareOptions): void;

export { type HydrogenMiddlewareOptions, setupHydrogenMiddleware };
