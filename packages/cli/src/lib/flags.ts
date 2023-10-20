import {Flags} from '@oclif/core';
import {camelize} from '@shopify/cli-kit/common/string';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {normalizeStoreFqdn} from '@shopify/cli-kit/node/context/fqdn';
import colors from '@shopify/cli-kit/node/colors';
import type {CamelCasedProperties} from 'type-fest';
import {STYLING_CHOICES} from './setups/css/index.js';
import {I18N_CHOICES} from './setups/i18n/index.js';

export const DEFAULT_PORT = 3000;

export const commonFlags = {
  path: Flags.string({
    description:
      'The path to the directory of the Hydrogen storefront. The default is the current directory.',
    env: 'SHOPIFY_HYDROGEN_FLAG_PATH',
  }),
  port: Flags.integer({
    description: 'Port to run the server on.',
    env: 'SHOPIFY_HYDROGEN_FLAG_PORT',
    default: DEFAULT_PORT,
  }),
  workerRuntime: Flags.boolean({
    description:
      'Run the app in a worker environment closer to Oxygen production instead of a Node.js sandbox. This flag is unstable and may change without notice.',
    env: 'SHOPIFY_HYDROGEN_FLAG_WORKER_UNSTABLE',
  }),
  force: Flags.boolean({
    description:
      'Overwrite the destination directory and files if they already exist.',
    env: 'SHOPIFY_HYDROGEN_FLAG_FORCE',
    char: 'f',
  }),
  shop: Flags.string({
    char: 's',
    description:
      'Shop URL. It can be the shop prefix (janes-apparel)' +
      ' or the full myshopify.com URL (janes-apparel.myshopify.com, https://janes-apparel.myshopify.com).',
    env: 'SHOPIFY_SHOP',
    parse: async (input) => normalizeStoreFqdn(input),
  }),
  installDeps: Flags.boolean({
    description: 'Auto install dependencies using the active package manager',
    env: 'SHOPIFY_HYDROGEN_FLAG_INSTALL_DEPS',
    allowNo: true,
  }),
  envBranch: Flags.string({
    description:
      "Specify an environment's branch name when using remote environment variables.",
    env: 'SHOPIFY_HYDROGEN_ENVIRONMENT_BRANCH',
    char: 'e',
  }),
  sourcemap: Flags.boolean({
    description: 'Generate sourcemaps for the build.',
    env: 'SHOPIFY_HYDROGEN_FLAG_SOURCEMAP',
    default: true,
    allowNo: true,
  }),
  codegenConfigPath: Flags.string({
    description:
      'Specify a path to a codegen configuration file. Defaults to `<root>/codegen.ts` if it exists.',
    required: false,
    dependsOn: ['codegen'],
  }),
  styling: Flags.string({
    description: `Sets the styling strategy to use. One of ${STYLING_CHOICES.map(
      (item) => `\`${item}\``,
    ).join(', ')}.`,
    choices: STYLING_CHOICES,
    env: 'SHOPIFY_HYDROGEN_FLAG_STYLING',
  }),
  markets: Flags.string({
    description: `Sets the URL structure to support multiple markets. One of ${I18N_CHOICES.map(
      (item) => `\`${item}\``,
    ).join(', ')}.`,
    choices: I18N_CHOICES,
    env: 'SHOPIFY_HYDROGEN_FLAG_I18N',
  }),
  shortcut: Flags.boolean({
    description: 'Create a shortcut to the Shopify Hydrogen CLI.',
    env: 'SHOPIFY_HYDROGEN_FLAG_SHORTCUT',
    allowNo: true,
  }),
};

export function flagsToCamelObject<T extends Record<string, any>>(obj: T) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[camelize(key) as any] = value;
    return acc;
  }, {} as any) as CamelCasedProperties<T>;
}

/**
 * Parse process arguments into an object for use in the cli as flags.
 * This is used when starting the init command from create-hydrogen without Oclif.
 * @example
 * input: `node ./bin --force --no-install-deps --language js`
 * output: { force: true, installDeps: false,  language: 'js' }
 */
export function parseProcessFlags(
  processArgv: string[],
  flagMap: Record<string, string> = {},
) {
  const [, , ...args] = processArgv;

  const options = {} as Record<string, string | boolean>;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg?.startsWith('-')) {
      let key = arg.replace(/^\-{1,2}/, '');
      let value = !nextArg || nextArg.startsWith('-') ? true : nextArg;

      if (value === true && key.startsWith('no-')) {
        value = false;
        key = key.replace('no-', '');
      }

      options[flagMap[key] || key] = value;
    }
  }

  return flagsToCamelObject(options);
}

/**
 * Create a deprecated flag to prevent the CLI from crashing when a deprecated flag is used.
 * Displays an info message when the flag is used.
 * @param name The name of the flag.
 */
export function deprecated(name: string) {
  return Flags.custom<unknown>({
    parse: () => {
      renderInfo({
        headline: `The ${colors.bold(
          name,
        )} flag is deprecated and will be removed in a future version of Shopify CLI.`,
      });

      return Promise.resolve(' ');
    },
    hidden: true,
  });
}

export function overrideFlag<T extends Record<string, any>>(
  flag: T,
  extra: Partial<T>,
) {
  return {
    ...flag,
    ...extra,
  };
}
