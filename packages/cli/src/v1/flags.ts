import {Flags} from '@oclif/core';

export const hydrogenFlags = {
  path: Flags.string({
    hidden: true,
    description: 'the path to your hydrogen storefront',
    env: 'SHOPIFY_HYDROGEN_FLAG_PATH',
  }),
  install: Flags.boolean({
    hidden: true,
    default: true,
    description: 'should install packages',
    env: 'SHOPIFY_HYDROGEN_FLAG_INSTALL',
    allowNo: true,
  }),
};
