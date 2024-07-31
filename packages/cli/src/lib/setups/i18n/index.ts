import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {AbortSignal} from '@shopify/cli-kit/node/abort';
import {getCodeFormatOptions} from '../../format-code.js';
import {replaceContextI18n} from './replacers.js';
import {getAssetsDir} from '../../build.js';

export const SETUP_I18N_STRATEGIES = [
  'subfolders',
  'domains',
  'subdomains',
] as const;

export type I18nStrategy = (typeof SETUP_I18N_STRATEGIES)[number];

export const I18N_STRATEGY_NAME_MAP: Record<I18nStrategy, string> = {
  subfolders: 'Subfolders (example.com/fr-ca/...)',
  subdomains: 'Subdomains (de.example.com/...)',
  domains: 'Top-level domains (example.jp/...)',
};

export const I18N_CHOICES = [...SETUP_I18N_STRATEGIES, 'none'] as const;
export type I18nChoice = (typeof I18N_CHOICES)[number];

export type I18nSetupConfig = {
  rootDirectory: string;
  contextCreate?: string;
};

export async function setupI18nStrategy(
  strategy: I18nStrategy,
  options: I18nSetupConfig,
) {
  const templatePath = await getAssetsDir('i18n', `${strategy}.ts`);

  if (!(await fileExists(templatePath))) {
    throw new Error('Unknown strategy');
  }

  const formatConfig = await getCodeFormatOptions(options.rootDirectory);

  await replaceContextI18n(options, formatConfig, templatePath);
}

export async function renderI18nPrompt<
  T extends string = I18nStrategy,
>(options?: {
  abortSignal?: AbortSignal;
  message?: string;
  extraChoices?: Record<T, string>;
}) {
  const i18nStrategies = Object.entries({
    ...I18N_STRATEGY_NAME_MAP,
    ...options?.extraChoices,
  }) as [[I18nStrategy | T, string]];

  return renderSelectPrompt<I18nStrategy | T>({
    message: 'Select a URL structure to support multiple markets',
    ...options,
    choices: i18nStrategies.map(([value, label]) => ({
      value,
      label,
    })),
  });
}
