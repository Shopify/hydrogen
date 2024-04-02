import type {ResolvedConfig} from 'vite';
import type {Request, Response} from '@shopify/mini-oxygen';

export type H2PluginContext = {
  setupScripts: Array<(url: string) => void>;
  shouldStartRuntime?: (config: ResolvedConfig) => boolean;
  services: Record<string, (request: Request) => Promise<Response>>;
  cliOptions?: Partial<
    HydrogenPluginOptions &
      OxygenPluginOptions & {
        envPromise: Promise<Record<string, any>>;
      }
  >;
};

export type HydrogenPluginOptions = {
  disableVirtualRoutes?: boolean;
};

export type OxygenPluginOptions = {
  ssrEntry?: string;
  debug?: boolean;
  inspectorPort?: number;
  env?: Record<string, any>;
  logRequestLine?: null | ((request: Request) => void);
};
