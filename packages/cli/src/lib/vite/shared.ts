// Do not import Vite in this file since it is used from
// the rest of the CLI when Vite might not be installed.
import type {ResolvedConfig, UserConfig} from 'vite';
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

const H2O_CONTEXT_KEY = '__h2oPluginContext';

export function getH2OPluginContext(config: UserConfig | ResolvedConfig) {
  return (config as any)?.[H2O_CONTEXT_KEY] as H2PluginContext;
}

export function setH2OPluginContext(options: Partial<H2PluginContext>) {
  return {[H2O_CONTEXT_KEY]: options} as Record<string, any>;
}
