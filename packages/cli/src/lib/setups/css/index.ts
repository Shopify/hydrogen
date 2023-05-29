import {setupTailwind} from './tailwind.js';
import type {SetupConfig} from './common.js';

export const SETUP_CSS_STRATEGIES = [
  'tailwind' /*'css-modules', 'vanilla-extract'*/,
] as const;

export type CssStrategy = (typeof SETUP_CSS_STRATEGIES)[number];

export function setupCssStrategy(
  strategy: CssStrategy,
  options: SetupConfig,
  force?: boolean,
) {
  switch (strategy) {
    case 'tailwind':
      return setupTailwind(options, force);
    default:
      throw new Error('Unknown strategy');
  }
}
