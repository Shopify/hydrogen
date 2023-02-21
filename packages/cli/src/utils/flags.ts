import Flags from '@oclif/core/lib/flags.js';
import {string as stringUtils} from '@shopify/cli-kit';

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
};

export function flagsToCamelObject(obj: Record<string, any>) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[stringUtils.camelize(key)] = value;
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
