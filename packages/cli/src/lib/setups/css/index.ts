import {type SetupTailwindConfig, setupTailwind} from './tailwind.js';

export const SETUP_CSS_STRATEGIES = [
  'tailwind' /*'css-modules', 'vanilla-extract'*/,
] as const;

export type CssStrategy = (typeof SETUP_CSS_STRATEGIES)[number];

export function setupCssStrategy(
  strategy: CssStrategy,
  options: SetupTailwindConfig,
  force?: boolean,
) {
  switch (strategy) {
    case 'tailwind':
      return setupTailwind(options, force);
    default:
      throw new Error('Unknown strategy');
  }
}
