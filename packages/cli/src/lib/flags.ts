import {Flags} from '@oclif/core';
import {camelize} from '@shopify/cli-kit/common/string';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {normalizeStoreFqdn} from '@shopify/cli-kit/node/context/fqdn';
import colors from '@shopify/cli-kit/node/colors';
import type {CamelCasedProperties} from 'type-fest';
import {STYLING_CHOICES} from './setups/css/index.js';
import {I18N_CHOICES} from './setups/i18n/index.js';
import {DEFAULT_INSPECTOR_PORT} from './mini-oxygen/common.js';

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
  legacyRuntime: Flags.boolean({
    description:
      'Run the app in a Node.js sandbox instead of an Oxygen worker.',
    env: 'SHOPIFY_HYDROGEN_FLAG_WORKER',
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
  codegen: Flags.boolean({
    description:
      'Generate types for the Storefront API queries found in your project.',
    required: false,
    default: false,
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
  debug: Flags.boolean({
    description: 'Enables inspector connections with a debugger.',
    env: 'SHOPIFY_HYDROGEN_FLAG_DEBUG',
    default: false,
  }),
  inspectorPort: Flags.integer({
    description: 'Port where the inspector will be available.',
    env: 'SHOPIFY_HYDROGEN_FLAG_INSPECTOR_PORT',
    default: DEFAULT_INSPECTOR_PORT,
  }),
  diff: Flags.boolean({
    description:
      "Applies the current files on top of Hydrogen's starter template in a temporary directory.",
    default: false,
    required: false,
    hidden: true,
  }),
  entry: Flags.string({
    description: 'Entry file for the worker. Defaults to `./server`.',
    env: 'SHOPIFY_HYDROGEN_FLAG_ENTRY',
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
export function deprecated(name: string, {isBoolean = false} = {}) {
  const customFlag = Flags.custom<unknown>({
    parse: () => {
      renderInfo({
        headline: `The ${colors.bold(
          name,
        )} flag is deprecated and will be removed in a future version of Shopify Hydrogen CLI.`,
      });

      return Promise.resolve(' ');
    },
    hidden: true,
  });

  // Overwrite `type:'option'` to avoid requiring values for this flag
  return {
    ...customFlag(),
    type: (isBoolean ? 'boolean' : 'option') as unknown as 'option',
  };
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
