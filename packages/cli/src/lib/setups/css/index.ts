import type {SetupConfig} from './common.js';
import type {CssStrategy} from './assets.js';

import {setupTailwind} from './tailwind.js';
import {setupPostCss} from './postcss.js';
import {setupCssModules} from './css-modules.js';

export {type CssStrategy, SETUP_CSS_STRATEGIES} from './assets.js';

export function setupCssStrategy(
  strategy: CssStrategy,
  options: SetupConfig,
  force?: boolean,
) {
  switch (strategy) {
    case 'tailwind':
      return setupTailwind(options, force);
    case 'postcss':
      return setupPostCss(options, force);
    case 'css-modules':
      return setupCssModules(options);
    default:
      throw new Error('Unknown strategy');
  }
}
