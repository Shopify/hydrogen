import {fileURLToPath} from 'node:url';
import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {fileExists, readFile} from '@shopify/cli-kit/node/fs';
import {AbortSignal} from '@shopify/cli-kit/node/abort';
import {getCodeFormatOptions} from '../../format-code.js';
import {replaceRemixEnv, replaceServerI18n} from './replacers.js';

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
  serverEntryPoint?: string;
};

export async function setupI18nStrategy(
  strategy: I18nStrategy,
  options: I18nSetupConfig,
) {
  const isTs = options.serverEntryPoint?.endsWith('.ts') ?? false;

  const templatePath = fileURLToPath(
    new URL(`./templates/${strategy}${isTs ? '.ts' : '.js'}`, import.meta.url),
  );

  if (!(await fileExists(templatePath))) {
    throw new Error('Unknown strategy');
  }

  const template = await readFile(templatePath);
  const formatConfig = await getCodeFormatOptions(options.rootDirectory);

  await replaceServerI18n(options, formatConfig, template);
  await replaceRemixEnv(options, formatConfig, template);
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
