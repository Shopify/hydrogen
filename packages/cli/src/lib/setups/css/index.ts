import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {AbortSignal} from '@shopify/cli-kit/node/abort';
import type {CssSetupConfig} from './common.js';
import {type CssStrategy, SETUP_CSS_STRATEGIES} from './assets.js';
import {setupTailwind} from './tailwind.js';
import {setupVanillaExtract} from './vanilla-extract.js';

export {type CssStrategy, SETUP_CSS_STRATEGIES};

export const STYLING_CHOICES = [...SETUP_CSS_STRATEGIES, 'none'] as const;
export type StylingChoice = (typeof STYLING_CHOICES)[number];

export const CSS_STRATEGY_NAME_MAP: Record<CssStrategy, string> = {
  tailwind: 'Tailwind (v4 beta)',
  'vanilla-extract': 'Vanilla Extract',
  'css-modules': 'CSS Modules',
  postcss: 'PostCSS',
};

export const CSS_STRATEGY_HELP_URL_MAP = {
  postcss: 'https://vitejs.dev/guide/features.html#postcss',
  'css-modules': 'https://vitejs.dev/guide/features.html#css-modules',
  'vanilla-extract': 'https://vanilla-extract.style/documentation/styling/',
  tailwind: 'https://tailwindcss.com/docs/configuration',
};

export function setupCssStrategy(
  strategy: CssStrategy,
  options: CssSetupConfig,
  force?: boolean,
) {
  switch (strategy) {
    case 'tailwind':
      return setupTailwind(options, force);
    case 'vanilla-extract':
      return setupVanillaExtract(options);
    case 'postcss':
    case 'css-modules':
      return {
        workPromise: Promise.resolve(),
        generatedAssets: [],
        needsInstallDeps: false,
      };
    default:
      throw new Error('Unknown strategy');
  }
}

export async function renderCssPrompt<
  T extends string = CssStrategy,
>(options?: {abortSignal?: AbortSignal; extraChoices?: Record<T, string>}) {
  const cssStrategies = Object.entries({
    ...CSS_STRATEGY_NAME_MAP,
    ...options?.extraChoices,
  }) as [[CssStrategy | T, string]];

  return renderSelectPrompt<CssStrategy | T>({
    message: 'Select a styling library',
    ...options,
    choices: cssStrategies.map(([value, label]) => ({
      value,
      label,
    })),
    defaultValue: 'tailwind',
  });
}
