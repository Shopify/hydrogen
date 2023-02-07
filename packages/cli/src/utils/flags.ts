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
