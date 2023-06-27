import {fileURLToPath} from 'node:url';
import {getCodeFormatOptions} from '../../format-code.js';
import {replaceRemixEnv, replaceServerI18n} from './replacers.js';
import {fileExists, readFile} from '@shopify/cli-kit/node/fs';

export const SETUP_I18N_STRATEGIES = [
  'subfolders',
  'domains',
  'subdomains',
] as const;

export type I18nStrategy = (typeof SETUP_I18N_STRATEGIES)[number];

export type SetupConfig = {
  rootDirectory: string;
  serverEntryPoint?: string;
  tsconfigPath?: string;
};

export async function setupI18nStrategy(
  strategy: I18nStrategy,
  options: SetupConfig,
) {
  const isTs = !!options.tsconfigPath;

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
