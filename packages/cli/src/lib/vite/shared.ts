// Do not import Vite in this file since it is used from
// the rest of the CLI when Vite might not be installed.
import type {ResolvedConfig, UserConfig} from 'vite';

export type HydrogenPluginContext = {
  cliOptions?: Partial<
    HydrogenPluginOptions & {
      envPromise: Promise<Record<string, any>>;
    }
  >;
};

export type HydrogenPluginOptions = {
  ssrEntry?: string;
  debug?: boolean;
  inspectorPort?: number;
};

// Note: Vite resolves extensions like .js or .ts automatically.
export const DEFAULT_SSR_ENTRY = './server';

const HYDROGEN_CONTEXT_KEY = '__hydrogenPluginContext';

export function getCliOptions(config: UserConfig | ResolvedConfig) {
  return ((config as any)?.[HYDROGEN_CONTEXT_KEY] as HydrogenPluginContext)
    ?.cliOptions;
}

export function setHydrogenPluginContext<T extends HydrogenPluginContext>(
  options: T,
) {
  return {[HYDROGEN_CONTEXT_KEY]: options} as Record<string, any>;
}
