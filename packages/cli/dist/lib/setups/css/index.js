import { renderSelectPrompt } from '@shopify/cli-kit/node/ui';
import { SETUP_CSS_STRATEGIES } from './assets.js';
export { SETUP_CSS_STRATEGIES } from './assets.js';
import { setupTailwind } from './tailwind.js';
import { setupPostCss } from './postcss.js';
import { setupCssModules } from './css-modules.js';
import { setupVanillaExtract } from './vanilla-extract.js';

const STYLING_CHOICES = [...SETUP_CSS_STRATEGIES, "none"];
const CSS_STRATEGY_NAME_MAP = {
  tailwind: "Tailwind",
  "css-modules": "CSS Modules",
  "vanilla-extract": "Vanilla Extract",
  postcss: "CSS"
};
function setupCssStrategy(strategy, options, force) {
  switch (strategy) {
    case "tailwind":
      return setupTailwind(options, force);
    case "postcss":
      return setupPostCss(options, force);
    case "css-modules":
      return setupCssModules(options);
    case "vanilla-extract":
      return setupVanillaExtract(options);
    default:
      throw new Error("Unknown strategy");
  }
}
async function renderCssPrompt(options) {
  const cssStrategies = Object.entries({
    ...CSS_STRATEGY_NAME_MAP,
    ...options?.extraChoices
  });
  return renderSelectPrompt({
    message: "Select a styling library",
    ...options,
    choices: cssStrategies.map(([value, label]) => ({
      value,
      label
    })),
    defaultValue: "tailwind"
  });
}

export { CSS_STRATEGY_NAME_MAP, STYLING_CHOICES, renderCssPrompt, setupCssStrategy };
