import {setupTailwind} from './tailwind.js';
import type {SetupConfig} from './common.js';

import type {CssStrategy} from './assets.js';

export {type CssStrategy, SETUP_CSS_STRATEGIES} from './assets.js';

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
