import { renderSelectPrompt } from '@shopify/cli-kit/node/ui';
import { fileExists, readFile } from '@shopify/cli-kit/node/fs';
import { getCodeFormatOptions } from '../../format-code.js';
import { replaceServerI18n, replaceRemixEnv } from './replacers.js';
import { getAssetsDir } from '../../build.js';

const SETUP_I18N_STRATEGIES = [
  "subfolders",
  "domains",
  "subdomains"
];
const I18N_STRATEGY_NAME_MAP = {
  subfolders: "Subfolders (example.com/fr-ca/...)",
  subdomains: "Subdomains (de.example.com/...)",
  domains: "Top-level domains (example.jp/...)"
};
const I18N_CHOICES = [...SETUP_I18N_STRATEGIES, "none"];
async function setupI18nStrategy(strategy, options) {
  const templatePath = await getAssetsDir("i18n", `${strategy}.ts`);
  if (!await fileExists(templatePath)) {
    throw new Error("Unknown strategy");
  }
  const template = await readFile(templatePath);
  const formatConfig = await getCodeFormatOptions(options.rootDirectory);
  const isJs = options.serverEntryPoint?.endsWith(".js") ?? false;
  await replaceServerI18n(options, formatConfig, template, isJs);
  await replaceRemixEnv(options, formatConfig, template);
}
async function renderI18nPrompt(options) {
  const i18nStrategies = Object.entries({
    ...I18N_STRATEGY_NAME_MAP,
    ...options?.extraChoices
  });
  return renderSelectPrompt({
    message: "Select a URL structure to support multiple markets",
    ...options,
    choices: i18nStrategies.map(([value, label]) => ({
      value,
      label
    }))
  });
}

export { I18N_CHOICES, I18N_STRATEGY_NAME_MAP, SETUP_I18N_STRATEGIES, renderI18nPrompt, setupI18nStrategy };
