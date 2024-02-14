// Do not import Vite in this file since it is used from
// the rest of the CLI when Vite might not be installed.
import type {ResolvedConfig, UserConfig} from 'vite';

export type H2OPluginContext = {
  cliOptions?: Partial<
    OxygenPluginOptions & {
      envPromise: Promise<Record<string, any>>;
    }
  >;
  setupFunctions?: Array<(viteUrl: string) => void>;
};

export type OxygenPluginOptions = {
  ssrEntry?: string;
  debug?: boolean;
  inspectorPort?: number;
};

// Note: Vite resolves extensions like .js or .ts automatically.
export const DEFAULT_SSR_ENTRY = './server';

const H2O_CONTEXT_KEY = '__h2oPluginContext';

export function getH2OPluginContext(config: UserConfig | ResolvedConfig) {
  return (config as any)?.[H2O_CONTEXT_KEY] as H2OPluginContext;
}

export function setH2OPluginContext<T extends H2OPluginContext>(options: T) {
  return {[H2O_CONTEXT_KEY]: options} as Record<string, any>;
}
