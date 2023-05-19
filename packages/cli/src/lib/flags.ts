import {Flags} from '@oclif/core';
import {camelize} from '@shopify/cli-kit/common/string';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {normalizeStoreFqdn} from '@shopify/cli-kit/node/context/fqdn';
import {colors} from './colors.js';

export const commonFlags = {
  path: Flags.string({
    description:
      'The path to the directory of the Hydrogen storefront. The default is the current directory.',
    env: 'SHOPIFY_HYDROGEN_FLAG_PATH',
  }),
  port: Flags.integer({
    description: 'Port to run the server on.',
    env: 'SHOPIFY_HYDROGEN_FLAG_PORT',
    default: 3000,
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
  ['env-branch']: Flags.string({
    description:
      "Specify an environment's branch name when using remote environment variables.",
    env: 'SHOPIFY_HYDROGEN_ENVIRONMENT_BRANCH',
    char: 'e',
    hidden: true,
  }),
};

export function flagsToCamelObject(obj: Record<string, any>) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[camelize(key)] = value;
    return acc;
  }, {} as any);
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
