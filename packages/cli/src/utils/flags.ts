import Flags from '@oclif/core/lib/flags.js';

export const commonFlags = {
  path: Flags.string({
    description: 'the path to your hydrogen storefront',
    env: 'SHOPIFY_HYDROGEN_FLAG_PATH',
  }),
  port: Flags.integer({
    description: 'Port to run the preview server on',
    env: 'SHOPIFY_HYDROGEN_FLAG_PORT',
    default: 3000,
  }),
};
