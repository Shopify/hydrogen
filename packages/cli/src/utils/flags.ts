import Flags from '@oclif/core/lib/flags.js';

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
  entry: Flags.string({
    description: 'The path to the server entry file.',
    env: 'SHOPIFY_HYDROGEN_FLAG_ENTRY',
    required: true,
  }),
  disableRouteWarning: Flags.boolean({
    description: 'Disable warning about missing standard routes.',
    env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_ROUTE_WARNING',
  }),
};
